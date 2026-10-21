import { describe, it, expect } from 'vitest';
import { calculateDexAndHedgingFlow } from '../services/gex/dexEngine';
import { StrikeGexDetail } from '../services/gex/types';

describe('dexEngine', () => {
  const mockStrikes: StrikeGexDetail[] = [
    {
      strikePrice: 25000,
      callOi: 20000,
      callIv: 14,
      callGamma: 0.0002,
      callDelta: 0.65,
      callGex: 100000,
      putOi: 10000,
      putIv: 15,
      putGamma: 0.0002,
      putDelta: -0.35,
      putGex: -50000,
      netGex: 50000,
    },
    {
      strikePrice: 25100,
      callOi: 40000,
      callIv: 13.5,
      callGamma: 0.00025,
      callDelta: 0.50,
      callGex: 250000,
      putOi: 30000,
      putIv: 14.5,
      putGamma: 0.00025,
      putDelta: -0.50,
      putGex: -187500,
      netGex: 62500,
    },
  ];

  it('calculates total call DEX, put DEX, and net DEX in crores', () => {
    const result = calculateDexAndHedgingFlow(mockStrikes, 25100, 25, 112500);

    expect(result.totalCallDexCr).toBeGreaterThan(0);
    expect(result.totalPutDexCr).toBeLessThan(0);
    expect(typeof result.netDexCr).toBe('number');
    expect(result.hedgingFlow1PctCr).toBeGreaterThan(0);
    expect(result.hedgingAction).toBe('DEALERS_SELL_RALLIES_BUY_DIPS');
  });

  it('identifies short gamma dealer hedging acceleration when net GEX is negative', () => {
    const result = calculateDexAndHedgingFlow(mockStrikes, 25100, 25, -250000);

    expect(result.hedgingAction).toBe('DEALERS_BUY_RALLIES_SELL_DIPS');
  });

  it('handles empty strikes gracefully', () => {
    const result = calculateDexAndHedgingFlow([], 25100, 25, 0);

    expect(result.netDexCr).toBe(0);
    expect(result.hedgingFlow1PctCr).toBe(0);
    expect(result.dealerDirectionalBias).toBe('DELTA_NEUTRAL');
  });
});
