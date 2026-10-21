import { StrikeGexDetail, DealerBias } from './types';

export interface PcGexStrikeDetail extends StrikeGexDetail {
  pcCallGex: number;
  pcPutGex: number;
  pcNetGex: number;
  oiSkewFactor: number;
}

export interface PcGexResult {
  isExperimental: true;
  modelName: 'PC-GEX (Positional-Cash Gamma Exposure)';
  disclaimer: string;
  totalPcCallGex: number;
  totalPcPutGex: number;
  netPcTotalGex: number;
  pcCallWall: number;
  pcPutWall: number;
  pcGammaFlip: number;
  pcDealerBias: DealerBias;
  strikes: PcGexStrikeDetail[];
}

/**
 * Calculates Segregated Experimental PC-GEX (Positional-Cash Gamma Exposure).
 *
 * Adheres strictly to AGENTS.md Rule 11:
 * - Conventional GEX remains standard.
 * - PC-GEX is segregated, flagged as experimental.
 * - Never fabricates or assumes missing trade footprint data.
 */
export function calculatePcGex(
  conventionalStrikes: StrikeGexDetail[],
  spot: number
): PcGexResult {
  const disclaimer =
    'EXPERIMENTAL MODEL: PC-GEX adjusts conventional Black-Scholes gamma using relative Put/Call open interest skew. Use alongside conventional GEX for comparative analysis.';

  if (!conventionalStrikes || conventionalStrikes.length === 0 || spot <= 0) {
    return {
      isExperimental: true,
      modelName: 'PC-GEX (Positional-Cash Gamma Exposure)',
      disclaimer,
      totalPcCallGex: 0,
      totalPcPutGex: 0,
      netPcTotalGex: 0,
      pcCallWall: 0,
      pcPutWall: 0,
      pcGammaFlip: 0,
      pcDealerBias: 'NEUTRAL',
      strikes: [],
    };
  }

  let totalPcCallGex = 0;
  let totalPcPutGex = 0;
  let netPcTotalGex = 0;

  let maxCallGex = -Infinity;
  let maxPutGexMag = -Infinity;
  let pcCallWall = conventionalStrikes[0].strikePrice;
  let pcPutWall = conventionalStrikes[0].strikePrice;

  const strikes: PcGexStrikeDetail[] = [];

  for (const s of conventionalStrikes) {
    const totalOi = s.callOi + s.putOi;
    // Realized Put-Call Skew weight from actual broker OI: (Put - Call) / (Put + Call + 1)
    const oiSkew = totalOi > 0 ? (s.putOi - s.callOi) / (totalOi + 1) : 0;
    const oiSkewFactor = 1 + oiSkew * 0.5;

    // Weight gamma exposure with verifiable positional skew
    const pcCallGex = s.callGex * (1 - oiSkew * 0.25);
    const pcPutGex = s.putGex * (1 + oiSkew * 0.25);
    const pcNetGex = pcCallGex + pcPutGex;

    totalPcCallGex += pcCallGex;
    totalPcPutGex += Math.abs(pcPutGex);
    netPcTotalGex += pcNetGex;

    if (pcCallGex > maxCallGex) {
      maxCallGex = pcCallGex;
      pcCallWall = s.strikePrice;
    }

    if (Math.abs(pcPutGex) > maxPutGexMag) {
      maxPutGexMag = Math.abs(pcPutGex);
      pcPutWall = s.strikePrice;
    }

    strikes.push({
      ...s,
      pcCallGex,
      pcPutGex,
      pcNetGex,
      oiSkewFactor: Number(oiSkewFactor.toFixed(3)),
    });
  }

  // Linear zero-crossing interpolation for PC-GEX Gamma Flip
  let pcGammaFlip = spot;
  const sorted = [...strikes].sort((a, b) => a.strikePrice - b.strikePrice);
  for (let i = 0; i < sorted.length - 1; i++) {
    const s1 = sorted[i];
    const s2 = sorted[i + 1];
    if ((s1.pcNetGex <= 0 && s2.pcNetGex >= 0) || (s1.pcNetGex >= 0 && s2.pcNetGex <= 0)) {
      const gexSpan = s2.pcNetGex - s1.pcNetGex;
      if (Math.abs(gexSpan) > 1e-6) {
        const t = (0 - s1.pcNetGex) / gexSpan;
        pcGammaFlip = Number((s1.strikePrice + t * (s2.strikePrice - s1.strikePrice)).toFixed(2));
        break;
      }
    }
  }

  const pcDealerBias: DealerBias =
    Math.abs(netPcTotalGex) > 1e3
      ? netPcTotalGex > 0
        ? 'LONG_GAMMA'
        : 'SHORT_GAMMA'
      : 'NEUTRAL';

  return {
    isExperimental: true,
    modelName: 'PC-GEX (Positional-Cash Gamma Exposure)',
    disclaimer,
    totalPcCallGex,
    totalPcPutGex,
    netPcTotalGex,
    pcCallWall,
    pcPutWall,
    pcGammaFlip,
    pcDealerBias,
    strikes,
  };
}
