import { StrikeGexDetail } from './types';

export interface DexCalculationResult {
  totalCallDexCr: number;
  totalPutDexCr: number;
  netDexCr: number;
  dealerDirectionalBias: 'NET_LONG_DELTA' | 'NET_SHORT_DELTA' | 'DELTA_NEUTRAL';
  hedgingFlow1PctCr: number;
  hedgingAction: 'DEALERS_SELL_RALLIES_BUY_DIPS' | 'DEALERS_BUY_RALLIES_SELL_DIPS' | 'NEUTRAL';
}

/**
 * Calculates Net Delta Exposure (DEX) and dealer re-hedging flows per 1% spot move.
 */
export function calculateDexAndHedgingFlow(
  strikes: StrikeGexDetail[],
  spot: number,
  lotSize: number,
  netTotalGex: number
): DexCalculationResult {
  if (!strikes || strikes.length === 0 || spot <= 0 || lotSize <= 0) {
    return {
      totalCallDexCr: 0,
      totalPutDexCr: 0,
      netDexCr: 0,
      dealerDirectionalBias: 'DELTA_NEUTRAL',
      hedgingFlow1PctCr: 0,
      hedgingAction: 'NEUTRAL',
    };
  }

  let totalCallDexRupees = 0;
  let totalPutDexRupees = 0;

  for (const s of strikes) {
    const callDelta = s.callDelta ?? 0;
    const putDelta = s.putDelta ?? 0;

    // Call DEX = Delta * Call OI * LotSize * Spot
    totalCallDexRupees += callDelta * s.callOi * lotSize * spot;

    // Put DEX = Delta * Put OI * LotSize * Spot (putDelta is negative)
    totalPutDexRupees += putDelta * s.putOi * lotSize * spot;
  }

  const totalCallDexCr = Number((totalCallDexRupees / 1e7).toFixed(2));
  const totalPutDexCr = Number((totalPutDexRupees / 1e7).toFixed(2));
  const netDexCr = Number((totalCallDexCr + totalPutDexCr).toFixed(2));

  let dealerDirectionalBias: 'NET_LONG_DELTA' | 'NET_SHORT_DELTA' | 'DELTA_NEUTRAL' = 'DELTA_NEUTRAL';
  if (Math.abs(netDexCr) > 0.5) {
    dealerDirectionalBias = netDexCr > 0 ? 'NET_LONG_DELTA' : 'NET_SHORT_DELTA';
  }

  // Hedging flow required per 1% price move = Net GEX * Spot * 0.01 / 1e7
  const hedgingFlow1PctCr = Number(((Math.abs(netTotalGex) * spot * 0.01) / 1e7).toFixed(2));

  let hedgingAction: 'DEALERS_SELL_RALLIES_BUY_DIPS' | 'DEALERS_BUY_RALLIES_SELL_DIPS' | 'NEUTRAL' = 'NEUTRAL';
  if (netTotalGex > 1e4) {
    hedgingAction = 'DEALERS_SELL_RALLIES_BUY_DIPS';
  } else if (netTotalGex < -1e4) {
    hedgingAction = 'DEALERS_BUY_RALLIES_SELL_DIPS';
  }

  return {
    totalCallDexCr,
    totalPutDexCr,
    netDexCr,
    dealerDirectionalBias,
    hedgingFlow1PctCr,
    hedgingAction,
  };
}
