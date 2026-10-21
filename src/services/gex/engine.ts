import { NormalizedOptionChain } from '../dhan/types';
import { bsDelta, bsGamma } from './blackScholes';
import { solveImpliedVolatility } from './ivSolver';
import { calculateTimeToExpiryYears } from './timeToExpiry';
import { resolveLotSize } from './lotSize';
import {
  DealerBias,
  GexCalculationResult,
  GexEngineOptions,
  GexLevelName,
  GexLevelStatus,
  NearestGexLevelInfo,
  StrikeGexDetail,
} from './types';

const DEFAULT_RISK_FREE_RATE = 0.065; // 6.5% standard Indian repo/T-bill rate

/**
 * Calculates conventional Black-Scholes Gamma Exposure (GEX) across an option chain.
 *
 * Adheres strictly to AGENTS.md Rule 11:
 * - Conventional Black-Scholes GEX first.
 * - Never fabricate missing data.
 * - Pure, deterministic calculations.
 *
 * @param chain Normalized option chain data from Dhan client
 * @param options Calculation options (lot size, risk-free rate, current date)
 * @returns Complete GEX analysis with strike details, walls, flip level, and dealer bias
 */
export function calculateOptionChainGex(
  chain: NormalizedOptionChain,
  options: GexEngineOptions = {}
): GexCalculationResult {
  const spot = chain.underlyingPrice;
  const r = options.riskFreeRate ?? DEFAULT_RISK_FREE_RATE;
  const currentDate = options.currentDate ?? new Date();
  const lotSize = resolveLotSize(options.symbol ?? chain.underlyingScrip, options.lotSize);
  const T = calculateTimeToExpiryYears(chain.expiry, currentDate);

  if (!chain.strikes || chain.strikes.length === 0) {
    return {
      underlyingScrip: chain.underlyingScrip,
      underlyingPrice: spot,
      expiry: chain.expiry,
      lotSize,
      totalCallGex: 0,
      totalPutGex: 0,
      netTotalGex: 0,
      dealerBias: 'NEUTRAL',
      callWall: spot,
      putWall: spot,
      gammaFlip: spot,
      nearestGex: {
        level: spot,
        name: 'Gamma Flip',
        distancePts: 0,
        distancePct: 0,
        status: 'PINNING',
      },
      strikes: [],
      timestamp: chain.timestamp,
    };
  }

  // Ensure strikes are sorted ascending
  const sortedStrikes = [...chain.strikes].sort((a, b) => a.strikePrice - b.strikePrice);

  const strikeDetails: StrikeGexDetail[] = [];
  let totalCallGex = 0;
  let totalPutGex = 0;
  let netTotalGex = 0;

  let maxCallGex = -Infinity;
  let callWall = spot;

  let maxPutGexMagnitude = -Infinity;
  let putWall = spot;

  for (const item of sortedStrikes) {
    const K = item.strikePrice;

    // Solve theoretical IV directly from traded option price
    const callIv = solveImpliedVolatility(spot, K, r, T, item.callPrice, 'CALL');
    const putIv = solveImpliedVolatility(spot, K, r, T, item.putPrice, 'PUT');

    // Calculate analytical Gammas and Deltas
    const callGamma = bsGamma(spot, K, r, T, callIv);
    const putGamma = bsGamma(spot, K, r, T, putIv);
    const callDelta = bsDelta(spot, K, r, T, callIv, 'CALL');
    const putDelta = bsDelta(spot, K, r, T, putIv, 'PUT');

    // Call GEX is positive (dealer short call -> positive market gamma exposure)
    const callGex = callGamma * item.callOi * lotSize;

    // Put GEX is negative by convention (dealer short put -> negative market gamma exposure)
    const putGex = -(putGamma * item.putOi * lotSize);

    const netGex = callGex + putGex;

    totalCallGex += callGex;
    totalPutGex += Math.abs(putGex);
    netTotalGex += netGex;

    // Track Call Wall (highest call gamma exposure)
    if (callGex > maxCallGex) {
      maxCallGex = callGex;
      callWall = K;
    }

    // Track Put Wall (highest put gamma exposure magnitude)
    const absPutGex = Math.abs(putGex);
    if (absPutGex > maxPutGexMagnitude) {
      maxPutGexMagnitude = absPutGex;
      putWall = K;
    }

    strikeDetails.push({
      strikePrice: K,
      callOi: item.callOi,
      callIv,
      callGamma,
      callDelta,
      callPrice: item.callPrice,
      callGex,
      putOi: item.putOi,
      putIv,
      putGamma,
      putDelta,
      putPrice: item.putPrice,
      putGex,
      netGex,
    });
  }

  // Calculate Gamma Flip level
  const gammaFlip = calculateGammaFlipLevel(strikeDetails, spot);

  // Dealer Bias
  let dealerBias: DealerBias = 'NEUTRAL';
  if (Math.abs(netTotalGex) > 1e-4) {
    dealerBias = netTotalGex > 0 ? 'LONG_GAMMA' : 'SHORT_GAMMA';
  }

  // Classify Nearest Key GEX Level
  const nearestGex = evaluateNearestGexLevel(spot, callWall, putWall, gammaFlip);

  return {
    underlyingScrip: chain.underlyingScrip,
    underlyingPrice: spot,
    expiry: chain.expiry,
    lotSize,
    totalCallGex,
    totalPutGex,
    netTotalGex,
    dealerBias,
    callWall,
    putWall,
    gammaFlip,
    nearestGex,
    strikes: strikeDetails,
    timestamp: chain.timestamp,
  };
}

/**
 * Calculates the Gamma Flip level where Net GEX crosses from negative to positive.
 * Interpolates between adjacent strikes where cumulative Net GEX transitions across zero.
 */
function calculateGammaFlipLevel(strikes: StrikeGexDetail[], spot: number): number {
  if (strikes.length === 0) return spot;
  if (strikes.length === 1) return strikes[0].strikePrice;

  // Track cumulative Net GEX across strikes
  let runningNet = 0;
  const cumulativeNet: number[] = [];
  for (const s of strikes) {
    runningNet += s.netGex;
    cumulativeNet.push(runningNet);
  }

  // Look for sign flip in cumulative Net GEX
  for (let i = 0; i < cumulativeNet.length - 1; i++) {
    const c1 = cumulativeNet[i];
    const c2 = cumulativeNet[i + 1];

    if ((c1 <= 0 && c2 >= 0) || (c1 >= 0 && c2 <= 0)) {
      const k1 = strikes[i].strikePrice;
      const k2 = strikes[i + 1].strikePrice;
      const span = c2 - c1;
      if (Math.abs(span) < 1e-6) {
        return 0.5 * (k1 + k2);
      }
      const fraction = (0 - c1) / span;
      return k1 + fraction * (k2 - k1);
    }
  }

  // If no sign flip in cumulative, check individual strike Net GEX sign inversion
  for (let i = 0; i < strikes.length - 1; i++) {
    const n1 = strikes[i].netGex;
    const n2 = strikes[i + 1].netGex;

    if ((n1 <= 0 && n2 >= 0) || (n1 >= 0 && n2 <= 0)) {
      const k1 = strikes[i].strikePrice;
      const k2 = strikes[i + 1].strikePrice;
      const span = n2 - n1;
      if (Math.abs(span) < 1e-6) {
        return 0.5 * (k1 + k2);
      }
      const fraction = (0 - n1) / span;
      return k1 + fraction * (k2 - k1);
    }
  }

  // Default to strike closest to spot if strictly positive or negative
  return cumulativeNet[0] > 0 ? strikes[0].strikePrice : strikes[strikes.length - 1].strikePrice;
}

/**
 * Finds the nearest key GEX level to current underlying price and categorizes proximity.
 */
function evaluateNearestGexLevel(
  spot: number,
  callWall: number,
  putWall: number,
  gammaFlip: number
): NearestGexLevelInfo {
  const candidates: Array<{ name: GexLevelName; level: number }> = [
    { name: 'Call Wall', level: callWall },
    { name: 'Put Wall', level: putWall },
    { name: 'Gamma Flip', level: gammaFlip },
  ];

  let best = candidates[0];
  let minAbsDiff = Math.abs(candidates[0].level - spot);

  for (let i = 1; i < candidates.length; i++) {
    const diff = Math.abs(candidates[i].level - spot);
    if (diff < minAbsDiff) {
      minAbsDiff = diff;
      best = candidates[i];
    }
  }

  const distancePts = best.level - spot;
  const distancePct = spot > 0 ? (distancePts / spot) * 100 : 0;
  const absPct = Math.abs(distancePct);

  let status: GexLevelStatus = 'APPROACHING';
  if (absPct <= 0.1) {
    status = 'PINNING';
  } else if (absPct <= 0.3) {
    status = 'TESTING';
  } else if (absPct <= 1.0) {
    status = 'APPROACHING';
  } else {
    status = 'BREACHED';
  }

  return {
    level: best.level,
    name: best.name,
    distancePts,
    distancePct,
    status,
  };
}
