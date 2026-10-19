import { describe, it, expect } from 'vitest';
import { solveImpliedVolatility } from '../services/gex/ivSolver';
import { bsCallPrice, bsPutPrice } from '../services/gex/blackScholes';

describe('Implied Volatility (IV) Numerical Solver', () => {
  const S = 25000;
  const K = 25000;
  const r = 0.065;
  const T = 7 / 365.25; // 1 week
  const trueVol = 0.16; // 16% IV

  it('inverts ATM Call market price back to true implied volatility accurately', () => {
    const marketPrice = bsCallPrice(S, K, r, T, trueVol);
    const solvedIv = solveImpliedVolatility(S, K, r, T, marketPrice, 'CALL');
    expect(solvedIv).toBeCloseTo(trueVol, 3);
  });

  it('inverts ATM Put market price back to true implied volatility accurately', () => {
    const marketPrice = bsPutPrice(S, K, r, T, trueVol);
    const solvedIv = solveImpliedVolatility(S, K, r, T, marketPrice, 'PUT');
    expect(solvedIv).toBeCloseTo(trueVol, 3);
  });

  it('inverts OTM Call (strike 25500) accurately', () => {
    const otmK = 25500;
    const marketPrice = bsCallPrice(S, otmK, r, T, trueVol);
    const solvedIv = solveImpliedVolatility(S, otmK, r, T, marketPrice, 'CALL');
    expect(solvedIv).toBeCloseTo(trueVol, 3);
  });

  it('inverts OTM Put (strike 24500) accurately', () => {
    const otmK = 24500;
    const marketPrice = bsPutPrice(S, otmK, r, T, trueVol);
    const solvedIv = solveImpliedVolatility(S, otmK, r, T, marketPrice, 'PUT');
    expect(solvedIv).toBeCloseTo(trueVol, 3);
  });

  it('inverts ITM Call accurately', () => {
    const itmK = 24500;
    const marketPrice = bsCallPrice(S, itmK, r, T, trueVol);
    const solvedIv = solveImpliedVolatility(S, itmK, r, T, marketPrice, 'CALL');
    expect(solvedIv).toBeCloseTo(trueVol, 3);
  });

  it('clamps gracefully to minimum boundary if market price is zero or sub-intrinsic', () => {
    // Call deep ITM but price is 0 (anomalous data feed)
    const ivSubIntrinsic = solveImpliedVolatility(S, 20000, r, T, 0, 'CALL');
    expect(ivSubIntrinsic).toBe(0.01);

    // Call market price 0
    const ivZero = solveImpliedVolatility(S, K, r, T, 0, 'CALL');
    expect(ivZero).toBe(0.01);
  });

  it('clamps gracefully to maximum boundary (500% IV) if market price is absurdly inflated', () => {
    const inflatedPrice = S * 2; // price higher than underlying
    const ivMax = solveImpliedVolatility(S, K, r, T, inflatedPrice, 'CALL');
    expect(ivMax).toBe(5.0);
  });
});
