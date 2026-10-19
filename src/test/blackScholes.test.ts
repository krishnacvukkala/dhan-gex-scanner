import { describe, it, expect } from 'vitest';
import {
  standardNormalCdf,
  standardNormalPdf,
  bsCallPrice,
  bsPutPrice,
  bsGamma,
  bsVega,
  bsDelta,
} from '../services/gex/blackScholes';

describe('Black-Scholes Numerical Core', () => {
  describe('Standard Normal Distribution', () => {
    it('evaluates standard normal CDF accurately at key points', () => {
      // Benchmark values
      expect(standardNormalCdf(0)).toBeCloseTo(0.5, 6);
      expect(standardNormalCdf(1.95996)).toBeCloseTo(0.975, 4);
      expect(standardNormalCdf(-1.95996)).toBeCloseTo(0.025, 4);
      expect(standardNormalCdf(3.0)).toBeCloseTo(0.99865, 4);
      expect(standardNormalCdf(-3.0)).toBeCloseTo(0.00135, 4);
    });

    it('evaluates standard normal PDF accurately', () => {
      // 1 / sqrt(2 * pi) ~= 0.39894228
      expect(standardNormalPdf(0)).toBeCloseTo(0.398942, 5);
      expect(standardNormalPdf(1)).toBeCloseTo(0.24197, 4);
      expect(standardNormalPdf(-1)).toBeCloseTo(0.24197, 4);
    });
  });

  describe('Option Pricing', () => {
    // Textbook benchmark: S=100, K=100, r=0.05, T=1, sigma=0.2
    // Analytical Call = 10.4506, Put = 5.5735
    const S = 100;
    const K = 100;
    const r = 0.05;
    const T = 1.0;
    const sigma = 0.2;

    it('computes European Call price accurately against analytical benchmarks', () => {
      const call = bsCallPrice(S, K, r, T, sigma);
      expect(call).toBeCloseTo(10.4506, 3);
    });

    it('computes European Put price accurately against analytical benchmarks', () => {
      const put = bsPutPrice(S, K, r, T, sigma);
      expect(put).toBeCloseTo(5.5735, 3);
    });

    it('strictly satisfies Put-Call Parity: C - P = S - K * exp(-r * T)', () => {
      const call = bsCallPrice(S, K, r, T, sigma);
      const put = bsPutPrice(S, K, r, T, sigma);
      const parityRhs = S - K * Math.exp(-r * T);
      expect(call - put).toBeCloseTo(parityRhs, 5);
    });

    it('handles zero or negative time gracefully', () => {
      // At expiration (T=0), Call is max(0, S - K) = 10, Put is max(0, K - S) = 0 for S=110, K=100
      expect(bsCallPrice(110, 100, 0.05, 0, 0.2)).toBe(10);
      expect(bsPutPrice(110, 100, 0.05, 0, 0.2)).toBe(0);
      expect(bsPutPrice(90, 100, 0.05, 0, 0.2)).toBe(10);
    });
  });

  describe('Analytical Greeks', () => {
    const S = 100;
    const K = 100;
    const r = 0.05;
    const T = 1.0;
    const sigma = 0.2;

    it('computes identical Gamma for both European Call and Put', () => {
      const gamma = bsGamma(S, K, r, T, sigma);
      // For S=100, K=100, r=0.05, T=1, sigma=0.2:
      // d1 = (0 + 0.05 + 0.02) / 0.2 = 0.07 / 0.2 = 0.35
      // phi(0.35) ~= 0.37524
      // Gamma = 0.37524 / (100 * 0.2 * 1) = 0.01876
      expect(gamma).toBeCloseTo(0.01876, 4);
    });

    it('computes Delta bounded within [0, 1] for Call and [-1, 0] for Put', () => {
      const callDelta = bsDelta(S, K, r, T, sigma, 'CALL');
      const putDelta = bsDelta(S, K, r, T, sigma, 'PUT');

      expect(callDelta).toBeGreaterThan(0);
      expect(callDelta).toBeLessThan(1);
      expect(putDelta).toBeGreaterThan(-1);
      expect(putDelta).toBeLessThan(0);

      // Delta relation: Delta_Call - Delta_Put = 1
      expect(callDelta - putDelta).toBeCloseTo(1.0, 5);
    });

    it('computes Vega accurately', () => {
      const vega = bsVega(S, K, r, T, sigma);
      // Vega = S * sqrt(T) * phi(d1) = 100 * 1 * 0.37524 ~= 37.524
      expect(vega).toBeCloseTo(37.524, 2);
    });
  });
});
