import { bsCallPrice, bsPutPrice, bsVega } from './blackScholes';

const MIN_VOL = 0.01;  // 1% annual volatility
const MAX_VOL = 5.00;  // 500% annual volatility
const MAX_ITERATIONS = 50;
const EPSILON = 0.005; // Maximum acceptable price error

/**
 * Solves theoretical Implied Volatility (IV) given market price using a hybrid
 * Newton-Raphson method with dynamic step-limiting and Bisection fallback.
 *
 * @param S Current underlying price
 * @param K Strike price
 * @param r Risk-free rate (e.g. 0.065 for 6.5%)
 * @param T Time to expiration in years
 * @param marketPrice Option market traded price (LTP)
 * @param type 'CALL' or 'PUT'
 * @returns Solved implied volatility sigma bounded within [MIN_VOL, MAX_VOL]
 */
export function solveImpliedVolatility(
  S: number,
  K: number,
  r: number,
  T: number,
  marketPrice: number,
  type: 'CALL' | 'PUT'
): number {
  if (T <= 0 || marketPrice <= 0 || S <= 0 || K <= 0) {
    return MIN_VOL;
  }

  // Check intrinsic value
  const discount = Math.exp(-r * T);
  const intrinsic = type === 'CALL'
    ? Math.max(0, S - K * discount)
    : Math.max(0, K * discount - S);

  if (marketPrice <= intrinsic) {
    return MIN_VOL;
  }

  const priceFn = (sigma: number) =>
    type === 'CALL'
      ? bsCallPrice(S, K, r, T, sigma)
      : bsPutPrice(S, K, r, T, sigma);

  // Check boundary prices
  const minPrice = priceFn(MIN_VOL);
  if (marketPrice <= minPrice) {
    return MIN_VOL;
  }

  const maxPrice = priceFn(MAX_VOL);
  if (marketPrice >= maxPrice) {
    return MAX_VOL;
  }

  // Initial estimate using Corrado-Miller / Brenner-Subrahmanyam approximation
  let sigma = 0.25; // 25% starting guess
  let low = MIN_VOL;
  let high = MAX_VOL;

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const currentPrice = priceFn(sigma);
    const diff = currentPrice - marketPrice;

    if (Math.abs(diff) <= EPSILON) {
      return Math.max(MIN_VOL, Math.min(MAX_VOL, sigma));
    }

    // Update bisection bounds
    if (diff > 0) {
      high = sigma;
    } else {
      low = sigma;
    }

    const vega = bsVega(S, K, r, T, sigma);

    // If Vega is reasonable, attempt Newton-Raphson step
    if (vega > 1e-4) {
      const step = diff / vega;
      const nextSigma = sigma - step;

      // Check if step stays within the current valid bracket
      if (nextSigma > low && nextSigma < high) {
        sigma = nextSigma;
        continue;
      }
    }

    // Fall back to bisection if Newton step jumped outside bracket or Vega too small
    sigma = 0.5 * (low + high);
  }

  return Math.max(MIN_VOL, Math.min(MAX_VOL, sigma));
}
