/**
 * High-precision Black-Scholes Numerical Core and Option Greeks
 * Implements European Call and Put pricing, Greeks (Gamma, Delta, Vega),
 * and Abramowitz & Stegun standard normal approximations.
 */

const INV_SQRT_2PI = 1 / Math.sqrt(2 * Math.PI);

/**
 * Standard Normal Probability Density Function phi(x) = (1 / sqrt(2 * pi)) * exp(-x^2 / 2)
 */
export function standardNormalPdf(x: number): number {
  return INV_SQRT_2PI * Math.exp(-0.5 * x * x);
}

/**
 * Standard Normal Cumulative Distribution Function Phi(x)
 * Abramowitz & Stegun 7.1.26 polynomial approximation with maximum error < 1.5e-7.
 */
export function standardNormalCdf(x: number): number {
  if (isNaN(x)) return NaN;
  if (x === Infinity) return 1;
  if (x === -Infinity) return 0;

  // Use symmetry for negative values: Phi(-x) = 1 - Phi(x)
  const isNegative = x < 0;
  const absX = Math.abs(x);

  const p = 0.2316419;
  const b1 = 0.319381530;
  const b2 = -0.356563782;
  const b3 = 1.781477937;
  const b4 = -1.821255978;
  const b5 = 1.330274429;

  const t = 1.0 / (1.0 + p * absX);
  const poly = ((((b5 * t + b4) * t + b3) * t + b2) * t + b1) * t;
  const cdf = 1.0 - standardNormalPdf(absX) * poly;

  return isNegative ? 1.0 - cdf : cdf;
}

/**
 * Computes Black-Scholes d1 and d2 parameters.
 */
export function calculateD1D2(
  S: number,
  K: number,
  r: number,
  T: number,
  sigma: number
): { d1: number; d2: number } {
  if (T <= 0 || sigma <= 0 || S <= 0 || K <= 0) {
    return { d1: 0, d2: 0 };
  }
  const sqrtT = Math.sqrt(T);
  const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * sqrtT);
  const d2 = d1 - sigma * sqrtT;
  return { d1, d2 };
}

/**
 * Computes European Call Price under Black-Scholes.
 */
export function bsCallPrice(
  S: number,
  K: number,
  r: number,
  T: number,
  sigma: number
): number {
  if (T <= 0) {
    return Math.max(0, S - K);
  }
  if (sigma <= 0) {
    return Math.max(0, S - K * Math.exp(-r * T));
  }

  const { d1, d2 } = calculateD1D2(S, K, r, T, sigma);
  const discount = Math.exp(-r * T);
  return S * standardNormalCdf(d1) - K * discount * standardNormalCdf(d2);
}

/**
 * Computes European Put Price under Black-Scholes.
 */
export function bsPutPrice(
  S: number,
  K: number,
  r: number,
  T: number,
  sigma: number
): number {
  if (T <= 0) {
    return Math.max(0, K - S);
  }
  if (sigma <= 0) {
    return Math.max(0, K * Math.exp(-r * T) - S);
  }

  const { d1, d2 } = calculateD1D2(S, K, r, T, sigma);
  const discount = Math.exp(-r * T);
  return K * discount * standardNormalCdf(-d2) - S * standardNormalCdf(-d1);
}

/**
 * Computes European Option Gamma (identical for Call and Put).
 * Gamma = phi(d1) / (S * sigma * sqrt(T))
 */
export function bsGamma(
  S: number,
  K: number,
  r: number,
  T: number,
  sigma: number
): number {
  if (T <= 0 || sigma <= 0 || S <= 0) {
    return 0;
  }
  const { d1 } = calculateD1D2(S, K, r, T, sigma);
  const denominator = S * sigma * Math.sqrt(T);
  if (denominator === 0) return 0;
  return standardNormalPdf(d1) / denominator;
}

/**
 * Computes Option Vega (sensitivity to volatility in price per 1.0 unit of sigma).
 * Vega = S * sqrt(T) * phi(d1)
 */
export function bsVega(
  S: number,
  K: number,
  r: number,
  T: number,
  sigma: number
): number {
  if (T <= 0 || sigma <= 0 || S <= 0) {
    return 0;
  }
  const { d1 } = calculateD1D2(S, K, r, T, sigma);
  return S * Math.sqrt(T) * standardNormalPdf(d1);
}

/**
 * Computes Option Delta.
 * Call Delta = Phi(d1)
 * Put Delta = Phi(d1) - 1
 */
export function bsDelta(
  S: number,
  K: number,
  r: number,
  T: number,
  sigma: number,
  type: 'CALL' | 'PUT'
): number {
  if (T <= 0) {
    if (type === 'CALL') return S >= K ? 1 : 0;
    return S < K ? -1 : 0;
  }
  const { d1 } = calculateD1D2(S, K, r, T, sigma);
  const callDelta = standardNormalCdf(d1);
  return type === 'CALL' ? callDelta : callDelta - 1;
}
