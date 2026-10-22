import { describe, it, expect } from 'vitest';
import { calculateMaxPain, calculatePinProbabilities } from '../services/gex/pinProbabilityEngine';
import { StrikeGexDetail } from '../services/gex/types';

describe('pinProbabilityEngine', () => {
  const createMockStrike = (
    strike: number,
    callOi: number,
    putOi: number,
    netGex: number,
    callIv = 0.14,
    putIv = 0.14
  ): StrikeGexDetail => ({
    strikePrice: strike,
    callOi,
    callIv,
    callGamma: 0.0002,
    callDelta: 0.5,
    callGex: netGex > 0 ? netGex : 10,
    putOi,
    putIv,
    putGamma: 0.0002,
    putDelta: -0.5,
    putGex: netGex < 0 ? netGex : -10,
    netGex,
  });

  describe('calculateMaxPain', () => {
    it('returns 0 for empty strikes', () => {
      const res = calculateMaxPain([]);
      expect(res.maxPainStrike).toBe(0);
      expect(res.losses.size).toBe(0);
    });

    it('identifies strike with minimal cumulative dealer payout', () => {
      // 3 strikes: 24900, 25000, 25100
      // 24900 has heavy Put OI, 25100 has heavy Call OI -> Max Pain should be 25000
      const strikes: StrikeGexDetail[] = [
        createMockStrike(24900, 10000, 150000, -50),
        createMockStrike(25000, 30000, 30000, 100),
        createMockStrike(25100, 180000, 15000, 80),
      ];

      const res = calculateMaxPain(strikes, 50);
      expect(res.maxPainStrike).toBe(25000);
      expect(res.losses.get(25000)).toBeDefined();
      expect(res.losses.get(25000)!).toBeLessThan(res.losses.get(24900)!);
      expect(res.losses.get(25000)!).toBeLessThan(res.losses.get(25100)!);
    });
  });

  describe('calculatePinProbabilities', () => {
    it('handles empty strikes gracefully', () => {
      const res = calculatePinProbabilities([], 25000, 0.01);
      expect(res.dominantPinStrike).toBe(25000);
      expect(res.maxPainStrike).toBe(25000);
      expect(res.pinConfidence).toBe('DISPERSED');
      expect(res.gravityVector.direction).toBe('PINNED');
      expect(res.strikes).toHaveLength(0);
    });

    it('computes normalized probability distribution summing close to 100%', () => {
      const strikes: StrikeGexDetail[] = [
        createMockStrike(24800, 20000, 80000, -20),
        createMockStrike(24900, 30000, 120000, -50),
        createMockStrike(25000, 150000, 140000, 180),
        createMockStrike(25100, 130000, 40000, 60),
        createMockStrike(25200, 90000, 15000, 30),
      ];

      const res = calculatePinProbabilities(strikes, 25005, 0.0005, 0.065);
      expect(res.strikes).toHaveLength(5);

      const totalProb = res.strikes.reduce((acc, s) => acc + s.pinProbabilityPct, 0);
      expect(totalProb).toBeGreaterThanOrEqual(99.0);
      expect(totalProb).toBeLessThanOrEqual(101.0);

      // Cumulative probability on last strike should be 100%
      expect(res.strikes[res.strikes.length - 1].cumulativeProbPct).toBeCloseTo(100, 0);
    });

    it('identifies dominant pin strike, gravity vector, and confidence', () => {
      const strikes: StrikeGexDetail[] = [
        createMockStrike(24800, 10000, 90000, -30),
        createMockStrike(24900, 20000, 150000, -70),
        createMockStrike(25000, 250000, 220000, 350), // Dominant strike
        createMockStrike(25100, 140000, 30000, 40),
        createMockStrike(25200, 100000, 10000, 15),
      ];

      // Spot is 24950, dominant pin is 25000 -> Bullish pull towards 25000
      const res = calculatePinProbabilities(strikes, 24950, 0.0002, 0.065);
      expect(res.dominantPinStrike).toBe(25000);
      expect(res.maxPainStrike).toBe(25000);
      expect(res.gravityVector.direction).toBe('BULLISH_PULL');
      expect(res.gravityVector.distancePts).toBe(50);
      expect(res.gravityVector.targetStrike).toBe(25000);
      expect(res.pinConfidence).toBe('HIGH');

      const dominant = res.strikes.find((s) => s.isDominantPin);
      expect(dominant).toBeDefined();
      expect(dominant?.strike).toBe(25000);
      expect(dominant?.isMaxPain).toBe(true);
    });

    it('adjusts probability concentration when simulatedExpiryMinutes scenario is provided', () => {
      const strikes: StrikeGexDetail[] = [
        createMockStrike(24900, 30000, 100000, -40),
        createMockStrike(25000, 200000, 180000, 220),
        createMockStrike(25100, 110000, 25000, 50),
      ];

      // Compare 120 minutes vs 15 minutes to expiry
      const res120 = calculatePinProbabilities(strikes, 25000, 0.001, 0.065, 120);
      const res15 = calculatePinProbabilities(strikes, 25000, 0.001, 0.065, 15);

      const atmProb120 = res120.strikes.find((s) => s.strike === 25000)?.pinProbabilityPct || 0;
      const atmProb15 = res15.strikes.find((s) => s.strike === 25000)?.pinProbabilityPct || 0;

      // With less time remaining (15 mins), probability concentration around ATM (25000) should increase
      expect(atmProb15).toBeGreaterThan(atmProb120);
      expect(res15.simulatedExpiryMinutes).toBe(15);
    });

    it('classifies PINNED when spot is within 20% of strike step from pin strike', () => {
      const strikes: StrikeGexDetail[] = [
        createMockStrike(24900, 20000, 80000, -20),
        createMockStrike(25000, 180000, 170000, 200),
        createMockStrike(25100, 90000, 20000, 30),
      ];

      // Spot is 25005 (distance = 5 pts, step = 100 pts -> 5 <= 20)
      const res = calculatePinProbabilities(strikes, 25005, 0.0005, 0.065);
      expect(res.gravityVector.direction).toBe('PINNED');
    });
  });
});
