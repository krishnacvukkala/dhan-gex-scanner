/**
 * Stage 8: 0DTE Expiry Pin Probability & Magnetic Strike Forecaster Engine
 * Computes Max Pain strike, risk-neutral expiry probability density across strikes,
 * composite strike pin likelihood scores, and dealer gravity vector pull.
 */

import { standardNormalCdf } from './blackScholes';
import {
  StrikeGexDetail,
  PinForecastResult,
  StrikePinDetail,
  GravityDirection,
  PinConfidence,
  PinGravityVector,
} from './types';

/**
 * Calculates Max Pain strike where option buyers suffer maximal financial loss,
 * minimizing aggregate dealer/market-maker cumulative payout.
 */
export function calculateMaxPain(strikes: StrikeGexDetail[], lotSize: number = 50): { maxPainStrike: number; losses: Map<number, number> } {
  if (strikes.length === 0) {
    return { maxPainStrike: 0, losses: new Map() };
  }

  let minLoss = Infinity;
  let maxPainStrike = strikes[0].strikePrice;
  const losses = new Map<number, number>();

  for (const candidate of strikes) {
    const K_target = candidate.strikePrice;
    let totalLoss = 0;

    for (const s of strikes) {
      // Call payout if price expires at K_target: max(0, K_target - s.strikePrice)
      if (K_target > s.strikePrice) {
        totalLoss += (K_target - s.strikePrice) * s.callOi * lotSize;
      }
      // Put payout if price expires at K_target: max(0, s.strikePrice - K_target)
      if (s.strikePrice > K_target) {
        totalLoss += (s.strikePrice - K_target) * s.putOi * lotSize;
      }
    }

    // Convert to ₹ Cr (1 Cr = 10^7)
    const lossCr = totalLoss / 1e7;
    losses.set(K_target, lossCr);

    if (totalLoss < minLoss) {
      minLoss = totalLoss;
      maxPainStrike = K_target;
    }
  }

  return { maxPainStrike, losses };
}

/**
 * Calculates risk-neutral expiry probability distribution and composite pin likelihood across strikes.
 *
 * @param strikes Sorted list of option strikes with OI, IV, and GEX details
 * @param spot Current underlying spot price
 * @param timeToExpiryYears Annualized time to expiry (targeting 15:30 IST)
 * @param riskFreeRate Annualized risk free interest rate (default 0.065)
 * @param simulatedExpiryMinutes Optional scenario override for remaining minutes to expiry
 */
export function calculatePinProbabilities(
  strikes: StrikeGexDetail[],
  spot: number,
  timeToExpiryYears: number,
  riskFreeRate: number = 0.065,
  simulatedExpiryMinutes?: number
): PinForecastResult {
  if (strikes.length === 0 || spot <= 0) {
    const defaultGravity: PinGravityVector = {
      targetStrike: spot,
      distancePts: 0,
      distancePct: 0,
      direction: 'PINNED',
      pullForceCr: 0,
    };
    return {
      dominantPinStrike: spot,
      maxPainStrike: spot,
      pinConfidence: 'DISPERSED',
      gravityVector: defaultGravity,
      strikes: [],
      simulatedExpiryMinutes,
    };
  }

  // Sort strikes ascending by strikePrice
  const sortedStrikes = [...strikes].sort((a, b) => a.strikePrice - b.strikePrice);

  // Compute median strike step
  let strikeStep = 50;
  if (sortedStrikes.length > 1) {
    const steps: number[] = [];
    for (let i = 1; i < sortedStrikes.length; i++) {
      const diff = sortedStrikes[i].strikePrice - sortedStrikes[i - 1].strikePrice;
      if (diff > 0) steps.push(diff);
    }
    if (steps.length > 0) {
      steps.sort((a, b) => a - b);
      strikeStep = steps[Math.floor(steps.length / 2)];
    }
  }

  // Effective time to expiry: floor to at least 5 minutes to prevent numerical singularities
  let effectiveT = timeToExpiryYears;
  if (simulatedExpiryMinutes !== undefined && simulatedExpiryMinutes > 0) {
    effectiveT = simulatedExpiryMinutes / (365 * 24 * 60);
  } else if (effectiveT <= 0.00001) {
    // Under 5 minutes: clamp to 5 mins
    effectiveT = 5 / (365 * 24 * 60);
  }

  // Compute representative IV (median of non-zero IVs)
  const nonZeroIvs = sortedStrikes
    .map((s) => (s.callIv + s.putIv) / 2)
    .filter((iv) => iv > 0.01 && iv < 2.0);
  let medianIv = 0.15; // default 15% IV
  if (nonZeroIvs.length > 0) {
    nonZeroIvs.sort((a, b) => a - b);
    medianIv = nonZeroIvs[Math.floor(nonZeroIvs.length / 2)];
  }

  // Calculate Max Pain
  const { maxPainStrike, losses } = calculateMaxPain(sortedStrikes);

  // Calculate total absolute Net GEX for concentration weighting
  const totalAbsGex = sortedStrikes.reduce((acc, s) => acc + Math.abs(s.netGex || 0), 0);

  // First pass: compute raw probability mass for each strike slice [K - step/2, K + step/2]
  const rawProbs: number[] = [];
  const sqrtT = Math.sqrt(effectiveT);

  for (const s of sortedStrikes) {
    const K = s.strikePrice;
    const K1 = K - strikeStep / 2;
    const K2 = K + strikeStep / 2;

    const strikeIv = s.callIv > 0 && s.putIv > 0 ? (s.callIv + s.putIv) / 2 : medianIv;
    const sigma = Math.max(0.04, Math.min(strikeIv, 1.5));

    // d2 formula: (ln(S / K) + (r - 0.5 * sigma^2) * T) / (sigma * sqrt(T))
    const d2_K1 = (Math.log(spot / K1) + (riskFreeRate - 0.5 * sigma * sigma) * effectiveT) / (sigma * sqrtT);
    const d2_K2 = (Math.log(spot / K2) + (riskFreeRate - 0.5 * sigma * sigma) * effectiveT) / (sigma * sqrtT);

    // K1 < K2 implies spot/K1 > spot/K2, so d2_K1 > d2_K2
    const probSlice = Math.max(0, standardNormalCdf(d2_K1) - standardNormalCdf(d2_K2));
    rawProbs.push(probSlice);
  }

  const rawSum = rawProbs.reduce((acc, p) => acc + p, 0);

  // Second pass: composite score and details
  let maxPinScore = -1;
  let dominantPinStrike = maxPainStrike;

  const tempDetails: Array<Omit<StrikePinDetail, 'cumulativeProbPct'>> = [];

  for (let i = 0; i < sortedStrikes.length; i++) {
    const s = sortedStrikes[i];
    const K = s.strikePrice;

    // Normalized probability percentage
    const pinProbPct = rawSum > 0 ? (rawProbs[i] / rawSum) * 100 : 100 / sortedStrikes.length;

    // GEX concentration
    const gexConcPct = totalAbsGex > 0 ? (Math.abs(s.netGex || 0) / totalAbsGex) * 100 : 0;

    // Max Pain proximity factor: peaks at 100 when K === maxPainStrike
    const distToMaxPain = Math.abs(K - maxPainStrike);
    const proximityScore = 100 / (1 + distToMaxPain / strikeStep);

    // Composite Pin Score: 45% Risk-Neutral Expiry Prob + 35% GEX Concentration + 20% Max Pain Proximity
    const compositePinScore = 0.45 * pinProbPct + 0.35 * gexConcPct + 0.20 * proximityScore;

    if (compositePinScore > maxPinScore) {
      maxPinScore = compositePinScore;
      dominantPinStrike = K;
    }

    tempDetails.push({
      strike: K,
      pinProbabilityPct: Number(pinProbPct.toFixed(2)),
      gexConcentrationPct: Number(gexConcPct.toFixed(2)),
      dealerLossCr: Number((losses.get(K) || 0).toFixed(2)),
      compositePinScore: Number(compositePinScore.toFixed(2)),
      isDominantPin: false,
      isMaxPain: K === maxPainStrike,
    });
  }

  // Mark dominant pin strike and compute cumulative probability
  let cumSum = 0;
  const strikePinDetails: StrikePinDetail[] = tempDetails.map((detail) => {
    cumSum += detail.pinProbabilityPct;
    return {
      ...detail,
      cumulativeProbPct: Number(Math.min(100, cumSum).toFixed(2)),
      isDominantPin: detail.strike === dominantPinStrike,
    };
  });

  // Evaluate Pin Confidence
  const topStrike = strikePinDetails.find((d) => d.strike === dominantPinStrike);
  let pinConfidence: PinConfidence = 'DISPERSED';
  if (topStrike) {
    if (topStrike.pinProbabilityPct >= 20 || topStrike.gexConcentrationPct >= 25) {
      pinConfidence = 'HIGH';
    } else if (topStrike.pinProbabilityPct >= 10 || topStrike.gexConcentrationPct >= 15) {
      pinConfidence = 'MODERATE';
    }
  }

  // Calculate Gravity Vector
  const distPts = dominantPinStrike - spot;
  const distPct = (distPts / spot) * 100;
  const thresholdPts = strikeStep * 0.2; // Within 20% of strike step is considered effectively pinned

  let direction: GravityDirection = 'PINNED';
  if (distPts > thresholdPts) {
    direction = 'BULLISH_PULL';
  } else if (distPts < -thresholdPts) {
    direction = 'BEARISH_PULL';
  }

  // Dealer Pull Force in ₹ Cr: proportional to dominant strike's net GEX and distance
  const dominantStrikeGex = sortedStrikes.find((s) => s.strikePrice === dominantPinStrike)?.netGex || 0;
  const pullForceCr = Math.abs(dominantStrikeGex);

  const gravityVector: PinGravityVector = {
    targetStrike: dominantPinStrike,
    distancePts: Number(distPts.toFixed(2)),
    distancePct: Number(distPct.toFixed(2)),
    direction,
    pullForceCr: Number(pullForceCr.toFixed(2)),
  };

  return {
    dominantPinStrike,
    maxPainStrike,
    pinConfidence,
    gravityVector,
    strikes: strikePinDetails,
    simulatedExpiryMinutes,
  };
}
