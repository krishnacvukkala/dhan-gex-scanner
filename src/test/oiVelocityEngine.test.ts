import { describe, it, expect } from 'vitest';
import { classifyBuildUp, calculateStrikeOiVelocity } from '../services/gex/oiVelocityEngine';
import { StrikeGexDetail } from '../services/gex/types';

describe('oiVelocityEngine', () => {
  describe('classifyBuildUp', () => {
    it('returns NEUTRAL for trivial OI changes below noise threshold', () => {
      expect(classifyBuildUp(10, 50)).toBe('NEUTRAL');
      expect(classifyBuildUp(-10, -80)).toBe('NEUTRAL');
    });

    it('classifies LONG_BUILDUP when price rises and OI rises', () => {
      expect(classifyBuildUp(15.5, 2500)).toBe('LONG_BUILDUP');
    });

    it('classifies SHORT_BUILDUP when price falls and OI rises', () => {
      expect(classifyBuildUp(-12.0, 3400)).toBe('SHORT_BUILDUP');
    });

    it('classifies LONG_UNWINDING when price falls and OI falls', () => {
      expect(classifyBuildUp(-8.5, -1800)).toBe('LONG_UNWINDING');
    });

    it('classifies SHORT_COVERING when price rises and OI falls', () => {
      expect(classifyBuildUp(22.0, -4200)).toBe('SHORT_COVERING');
    });
  });

  describe('calculateStrikeOiVelocity', () => {
    it('handles empty strikes gracefully', () => {
      const res = calculateStrikeOiVelocity([], 25000, 25);
      expect(res.totalCallOiChange).toBe(0);
      expect(res.totalPutOiChange).toBe(0);
      expect(res.netIntradayDeltaGexCr).toBe(0);
      expect(res.dominantFlow).toBe('NEUTRAL');
      expect(res.strikeDetails).toHaveLength(0);
    });

    it('computes strike-level ΔOI, ΔGEX, top accumulation strikes, and dominant flow', () => {
      const mockStrikes: StrikeGexDetail[] = [
        {
          strikePrice: 25000,
          callOi: 120000,
          callIv: 0.12,
          callGamma: 0.0003,
          callChangeOi: 15000,
          callPriceChange: 35.0, // Long build-up
          callGex: 50000000,
          putOi: 90000,
          putIv: 0.13,
          putGamma: 0.0003,
          putChangeOi: -8000,
          putPriceChange: -20.0, // Long unwinding
          putGex: -40000000,
          netGex: 10000000,
        },
        {
          strikePrice: 25200,
          callOi: 180000,
          callIv: 0.11,
          callGamma: 0.0004,
          callChangeOi: 25000, // Top Call accumulation
          callPriceChange: -18.0, // Short build-up
          callGex: 80000000,
          putOi: 60000,
          putIv: 0.14,
          putGamma: 0.0002,
          putChangeOi: 12000, // Top Put accumulation
          putPriceChange: -10.0, // Short build-up
          putGex: -30000000,
          netGex: 50000000,
        },
      ];

      const res = calculateStrikeOiVelocity(mockStrikes, 25100, 25);

      expect(res.totalCallOiChange).toBe(40000);
      expect(res.totalPutOiChange).toBe(4000);
      expect(res.topCallAccumulationStrike).toBe(25200);
      expect(res.topPutAccumulationStrike).toBe(25200);

      // Verify individual strike calculations
      expect(res.strikeDetails[0].callBuildUp).toBe('LONG_BUILDUP');
      expect(res.strikeDetails[0].putBuildUp).toBe('LONG_UNWINDING');
      expect(res.strikeDetails[1].callBuildUp).toBe('SHORT_BUILDUP');
      expect(res.strikeDetails[1].putBuildUp).toBe('SHORT_BUILDUP');

      expect(res.dominantFlow).toBe('SHORT_BUILDUP');
      expect(typeof res.netIntradayDeltaGexCr).toBe('number');
    });
  });
});
