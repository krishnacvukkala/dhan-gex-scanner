# Stage 8 Spec: 0DTE Expiry Pin Probability & Magnetic Strike Forecaster

## Objective
Provide derivative traders with quantitative expiration day pinning analytics and probability distributions for Indian index and equity derivatives.

## Mathematical Core
1. **Max Pain Strike:**
   For each candidate strike $K_j$:
   $$\text{Dealer Loss}(K_j) = \sum_{i} \left[ \max(0, K_j - K_i) \times \text{Put OI}_i + \max(0, K_i - K_j) \times \text{Call OI}_i \right] \times \text{LotSize}$$
   $$\text{Max Pain} = \arg\min_{K_j} \text{Dealer Loss}(K_j)$$

2. **Risk-Neutral Expiry Price Probability Density:**
   For each strike interval $[K - \frac{\Delta K}{2}, K + \frac{\Delta K}{2}]$, assuming log-normal diffusion with strike IV $\sigma_K$ and annualized time to 15:30 IST $T$:
   $$d_2(K) = \frac{\ln(S / K) + (r - \frac{1}{2}\sigma^2)T}{\sigma \sqrt{T}}$$
   $$P(K) = \Phi\left(d_2(K - \frac{\Delta K}{2})\right) - \Phi\left(d_2(K + \frac{\Delta K}{2})\right)$$
   Normalized across all strikes in chain: $\sum P_i = 100\%$.

3. **Composite Pin Likelihood Index:**
   Weighting $P(K)$ with strike GEX concentration and proximity to Max Pain:
   $$\text{Pin Score}(K) = 0.50 \times P(K) + 0.35 \times \frac{|\text{Net GEX}_K|}{\sum |\text{Net GEX}|} + 0.15 \times \text{ProximityFactor}(K, \text{MaxPain})$$

4. **Dealer Gravity Vector:**
   - Target Pin Strike $K^* = \arg\max \text{Pin Score}(K)$.
   - Direction: `BULLISH_PULL` if $K^* > S + \text{threshold}$, `BEARISH_PULL` if $K^* < S - \text{threshold}$, else `PINNED`.
   - Vector magnitude: Net ₹ Cr dealer hedging force pulling towards $K^*$.

## Architecture & Integration
- `src/services/gex/types.ts`: types `PinForecastResult`, `StrikePinDetail`, `GravityDirection`.
- `src/services/gex/pinProbabilityEngine.ts`: pure mathematical calculations.
- `src/test/pinProbabilityEngine.test.ts`: test suite.
- `src/components/PinProbabilityForecaster.tsx`: interactive Tab 6.
- `src/components/InstrumentDetail.tsx`: Tab 6 registration.
- `src/index.css`: styles.
