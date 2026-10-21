import { describe, it, expect } from 'vitest';
import { calculatePcGex } from '../services/gex/pcGexEngine';
import { StrikeGexDetail } from '../services/gex/types';

describe('pcGexEngine (Experimental Model)', () => {
  const mockStrikes: StrikeGexDetail[] = [
    {
      strikePrice: 24900,
      callOi: 10000,
      callIv: 14.5,
      callGamma: 0.00015,
      callGex: 75000,
      putOi: 80000,
      putIv: 15.2,
      putGamma: 0.00015,
      putGex: -600000,
      netGex: -525000,
    },
    {
      strikePrice: 25000,
      callOi: 30000,
      callIv: 14.0,
      callGamma: 0.0002,
      callGex: 150000,
      putOi: 40000,
      putIv: 14.5,
      putGamma: 0.0002,
      putGex: -200000,
      netGex: -50000,
    },
    {
      strikePrice: 25100,
      callOi: 50000,
      callIv: 13.8,
      callGamma: 0.00022,
      callGex: 275000,
      putOi: 20000,
      putIv: 14.2,
      putGamma: 0.00022,
      putDelta: -0.48,
      putGex: -110000,
      netGex: 165000,
    },
    {
      strikePrice: 25200,
      callOi: 90000,
      callIv: 14.1,
      callGamma: 0.00018,
      callGex: 405000,
      putOi: 10000,
      putIv: 14.6,
      putGamma: 0.00018,
      putGex: -45000,
      netGex: 360000,
    },
  ];

  it('calculates segregated PC-GEX and sets isExperimental flag', () => {
    const result = calculatePcGex(mockStrikes, 25050);

    expect(result.isExperimental).toBe(true);
    expect(result.modelName).toContain('PC-GEX');
    expect(result.disclaimer).toBeDefined();
    expect(result.pcCallWall).toBeGreaterThan(0);
    expect(result.pcPutWall).toBeGreaterThan(0);
    expect(result.pcGammaFlip).toBeGreaterThan(0);
    expect(result.strikes.length).toBe(4);
    expect(result.strikes[0].pcCallGex).toBeDefined();
    expect(result.strikes[0].pcPutGex).toBeDefined();
  });

  it('handles empty strikes array without crashing', () => {
    const result = calculatePcGex([], 25050);

    expect(result.isExperimental).toBe(true);
    expect(result.netPcTotalGex).toBe(0);
    expect(result.strikes.length).toBe(0);
  });
});
