# Stage 6: Institutional Quantitative Suite (DEX, Cross-Index Radar, Experimental PC-GEX, & Daily Session Recap) — Architecture & Design

## 1. Executive Summary

Stage 6 completes the institutional analytics capabilities of the Dhan GEX Scanner by integrating:
1. **Net Delta Exposure (DEX) & Dealer Hedging Flow Matrix:**
   - Quantifies total directional dollar delta held by dealers and exact cash hedging requirements per 1% move in the underlying asset.
2. **Cross-Index Institutional Gamma Radar & Heatmap:**
   - Institutional high-density comparison matrix across Indian benchmark indices (`NIFTY 50`, `BANKNIFTY`, `FINNIFTY`, `MIDCPNIFTY`, `SENSEX`).
3. **Segregated Experimental PC-GEX Mode (Rule 11):**
   - Distinct, segregated calculation model reflecting Put-Call / Positional-Cash exposure, with explicit experimental labeling and methodology disclosure.
4. **Daily Session Recap & Trade Journal Report:**
   - Post-market institutional audit card tracking level respect, wall breaches, regime pivots, and printable session summary report.

---

## 2. Mathematical Formulations

### A. Delta Exposure (DEX) & Hedging Matrix
For each strike $K$:
$$\text{Call DEX}_K = \Delta_{\text{Call}}(S, K, r, T, \sigma) \times \text{Call OI}_K \times \text{LotSize} \times S$$
$$\text{Put DEX}_K = \Delta_{\text{Put}}(S, K, r, T, \sigma) \times \text{Put OI}_K \times \text{LotSize} \times S$$
$$\text{Net DEX} = \sum_K (\text{Call DEX}_K + \text{Put DEX}_K)$$

**Dealer Hedging Flow per 1% Underlying Price Change:**
$$\Delta \text{Hedge}_{1\%} = \text{Net Total GEX} \times S \times 0.01$$
- If **Positive Net GEX**: Dealers must sell into rallies and buy into dips (mean-reverting stabilization).
- If **Negative Net GEX**: Dealers must buy into rallies and sell into sell-offs (pro-cyclical volatility acceleration).

### B. Segregated Experimental PC-GEX Model (Rule 11)
- Conventional GEX assumes symmetric dealer positioning based strictly on open interest.
- **PC-GEX (Positional-Cash GEX)** incorporates open interest volume skew:
  $$\text{PC-GEX}_K = \text{GEX}_K \times \left(1 + \frac{\text{Put OI}_K - \text{Call OI}_K}{\text{Put OI}_K + \text{Call OI}_K + 1}\right)$$
- Segregated into its own calculation pipeline and flagged with persistent warning badges.

---

## 3. Component Architecture

```
                       ┌────────────────────────────────────────┐
                       │              Navbar.tsx                │
                       │  (Radar View Toggle, Session Recap)    │
                       └───────────────────┬────────────────────┘
                                           │
         ┌─────────────────────────────────┼─────────────────────────────────┐
         ▼                                 ▼                                 ▼
┌──────────────────┐             ┌───────────────────┐             ┌───────────────────┐
│ CrossIndexRadar  │             │ InstrumentDetail  │             │ SessionRecapModal │
│  - Heatmap Grid  │             │  - DEX Card       │             │  - Level Respect  │
│  - Regime Radar  │             │  - 1% Move Gauge  │             │  - Breach Timeline│
│  - Cross-Asset   │             │  - PC-GEX Toggle  │             │  - Export / Print │
└──────────────────┘             └───────────────────┘             └───────────────────┘
```

---

## 4. Verification & Testing
- Vitest unit tests for:
  - DEX calculation engine (`dexEngine.test.ts`)
  - PC-GEX experimental engine (`pcGexEngine.test.ts`)
  - Cross-Index Radar component (`CrossIndexRadar.test.tsx`)
  - Session Recap generator (`SessionRecapModal.test.tsx`)
