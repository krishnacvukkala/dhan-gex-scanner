# Stage 3: Conventional GEX Calculation Engine — Design Spec

**Date:** 2026-10-19  
**Status:** Approved by User  
**Scope:** Stage 3 — Core Conventional Gamma Exposure (GEX) Calculation Engine for Indian Derivatives (Indices and F&O Stocks) via DhanHQ API Data Models.

---

## 1. Objectives & Compliance
- Implement a pure, deterministic, high-precision mathematical engine for calculating conventional Black-Scholes Greeks and aggregate Gamma Exposure.
- **Rule 11 (AGENTS.md):** Build conventional GEX first. Never fabricate or synthesize missing data. Treat experimental features (like PC-GEX) separately.
- **Rule 12 (AGENTS.md):** Strictly read-only analytical decision support. No automated order placement.

---

## 2. Mathematical Foundations (`src/services/gex/blackScholes.ts`)

### 2.1 Standard Normal Distribution
- **Cumulative Distribution Function $\Phi(x)$:**
  - Implemented via Abramowitz and Stegun 7.1.26 rational Chebyshev polynomial approximation (maximum error $< 1.5 \times 10^{-7}$).
- **Probability Density Function $\phi(x)$:**
  $$\phi(x) = \frac{1}{\sqrt{2\pi}} \exp\left(-\frac{x^2}{2}\right)$$

### 2.2 Black-Scholes European Option Pricing
For underlying price $S$, strike price $K$, risk-free rate $r$, annualized time-to-expiry $T$, and volatility $\sigma$:
$$d_1 = \frac{\ln(S / K) + (r + \frac{\sigma^2}{2}) T}{\sigma \sqrt{T}}$$
$$d_2 = d_1 - \sigma \sqrt{T}$$
- Call Price: $C = S \cdot \Phi(d_1) - K e^{-r T} \Phi(d_2)$
- Put Price: $P = K e^{-r T} \Phi(-d_2) - S \cdot \Phi(-d_1)$

### 2.3 Option Greeks
- **Gamma ($\Gamma$):**
  $$\Gamma = \frac{\phi(d_1)}{S \sigma \sqrt{T}}$$
  (Identical for European Calls and Puts).
- **Delta ($\Delta$):**
  - $\Delta_{call} = \Phi(d_1)$
  - $\Delta_{put} = \Phi(d_1) - 1$
- **Vega ($\nu$):**
  $$\nu = S \sqrt{T} \phi(d_1)$$

### 2.4 Implied Volatility (IV) Numerical Solver
- Theoretical IV solved directly from market option price using a hybrid **Newton-Raphson + Bisection method**.
- Update step:
  $$\sigma_{n+1} = \sigma_n - \frac{Price(\sigma_n) - Price_{market}}{\nu(\sigma_n)}$$
- Falls back to bisection search if Vega $\nu \approx 0$ or if Newton-Raphson diverges outside valid boundaries $[0.01, 5.00]$ (1% to 500% IV).
- Convergence criterion: $|Price(\sigma) - Price_{market}| \le 0.005$ or maximum 50 iterations.
- If market option price is less than or equal to intrinsic value ($\max(0, S - K)$ for calls, $\max(0, K - S)$ for puts), the solver gracefully returns minimum boundary $\sigma = 0.01$ rather than yielding `NaN`.

---

## 3. Expiration & Lot Size Resolution

### 3.1 Time-to-Expiry (`src/services/gex/timeToExpiry.ts`)
- Target: 15:30:00 IST (UTC+05:30) on expiration date.
- Formula:
  $$T = \max\left(\frac{t_{\text{expiry}} - t_{\text{current}}}{365.25 \times 24 \times 3600}, T_{\min}\right)$$
  - Where $T_{\min} = \frac{1}{365.25 \times 24 \times 60}$ (1 minute minimum guard to avoid division by zero).

### 3.2 Dynamic Lot Size Resolver (`src/services/gex/lotSize.ts`)
- Resolves lot size for both indices and all F&O stocks:
  1. Priority 1: Direct lot size provided in Dhan metadata / quote feed.
  2. Priority 2: Standard market lookup registry (NIFTY=25, BANKNIFTY=15, FINNIFTY=25, MIDCPNIFTY=50, SENSEX=10, BANKEX=15, and popular F&O equities like RELIANCE=250, INFY=400, TCS=175, HDFCBANK=550).
  3. Priority 3: Fallback default (1).

---

## 4. GEX Engine & Key Structural Levels (`src/services/gex/engine.ts`)

### 4.1 Gamma Exposure Calculation
For each strike $K$:
- $\text{Call GEX}_K = +\Gamma_{call, K} \times \text{Call OI}_K \times \text{LotSize}$
- $\text{Put GEX}_K = -\Gamma_{put, K} \times \text{Put OI}_K \times \text{LotSize}$
- $\text{Net GEX}_K = \text{Call GEX}_K + \text{Put GEX}_K$

### 4.2 Aggregate Metrics
- Total Call GEX $= \sum_K \text{Call GEX}_K$
- Total Put GEX $= \sum_K |\text{Put GEX}_K|$
- Net Total GEX $= \sum_K \text{Net GEX}_K$

### 4.3 Structural Levels
- **Call Wall:** $\arg\max_K (\text{Call GEX}_K)$ — Strike with highest positive Call GEX (dealer resistance / short gamma pin).
- **Put Wall:** $\arg\max_K (|\text{Put GEX}_K|)$ — Strike with highest magnitude Put GEX (dealer support).
- **Gamma Flip:** Price point where Net GEX transitions across zero, calculated via linear interpolation across adjacent strikes where sign inversion occurs.
- **Dealer Bias:**
  - `LONG_GAMMA` when $\text{Net Total GEX} > 0$ (volatility dampening).
  - `SHORT_GAMMA` when $\text{Net Total GEX} < 0$ (volatility acceleration).
  - `NEUTRAL` when $\text{Net Total GEX} = 0$.
- **Nearest Level Distance & Status:**
  - Evaluates distance from spot to nearest key level (Call Wall, Put Wall, Gamma Flip).
  - Categories: `APPROACHING` ($< 1\%$), `TESTING` ($< 0.3\%$), `PINNING` ($< 0.1\%$), or `BREACHED`.

---

## 5. Test Plan & Verifications
- **Unit Tests (`src/test/gexEngine.test.ts`):**
  1. Standard normal CDF & PDF accuracy against textbook Abramowitz-Stegun values.
  2. Black-Scholes Call/Put pricing matching known benchmark prices (e.g. Hull benchmark test cases).
  3. Put-Call parity validation: $C - P = S - K e^{-rT}$.
  4. Gamma symmetry ($\Gamma_{call} == \Gamma_{put}$).
  5. IV Solver convergence across ATM, ITM, and OTM strikes.
  6. Expiration time calculation with IST boundary handling.
  7. Lot size resolver for indices and F&O stocks.
  8. Full option chain GEX calculation:
     - Accurate Call Wall and Put Wall detection.
     - Accurate Gamma Flip interpolation.
     - Dealer Bias assignment.
     - Nearest GEX event categorization.
