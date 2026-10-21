# Stage 7 Design Spec: Real-Time Change in OI (ΔOI) & Gamma Velocity Matrix

## 1. Overview & Objectives

In derivatives microstructure, **static Open Interest (OI)** reflects historical contract build-up accumulated over days or weeks. However, intraday turning points, gamma squeeze triggers, and institutional positioning shifts are revealed by **Change in Open Interest ($\Delta\text{OI}$)** and the rate of change of dealer gamma (**Gamma Velocity $d\text{GEX}/dt$**).

Stage 7 implements:
1. **Intraday $\Delta\text{OI}$ & Build-up Classifier:** Evaluates strike-level Call/Put OI change and classifies option flow into Long Build-up, Short Build-up, Long Unwinding, and Short Covering.
2. **Intraday Gamma Velocity ($d\text{GEX}/dt$ & $\Delta\text{GEX}$):** Isolates the gamma generated solely by *today's* contract additions/reductions, pinpointing where dealers are accumulating or shedding tail risk in real-time.
3. **Interactive $\Delta\text{OI}$ & Velocity Visualization:** A new dedicated tab in `InstrumentDetail.tsx` with strike-level dual bars ($\Delta\text{OI}$ Call vs. Put), net $\Delta\text{GEX}$ impact, and summary metrics.
4. **Institutional Build-up Badging in Option Chain:** Enhancing the Option Chain table and Strike Profile with live $\Delta\text{OI}$ flow tags.
5. **No Data Fabrication (Rule 11):** Computes $\Delta\text{OI}$ deterministically from current and previous session/baseline data; flags unpopulated states gracefully.

---

## 2. Mathematical Modeling & Formulas

### 2.1 Intraday $\Delta\text{OI}$
For each strike $K$:
$$\Delta\text{OI}_{\text{Call}}(K) = \text{Call OI}_{\text{current}}(K) - \text{Call OI}_{\text{prev}}(K)$$
$$\Delta\text{OI}_{\text{Put}}(K) = \text{Put OI}_{\text{current}}(K) - \text{Put OI}_{\text{prev}}(K)$$

### 2.2 Market Participant Flow Classification
| Price Change ($\Delta P$) | OI Change ($\Delta\text{OI}$) | Classification | Market Significance |
| :--- | :--- | :--- | :--- |
| $\Delta P > 0$ | $\Delta\text{OI} > 0$ | **LONG_BUILDUP** | Bullish aggressive buying of contracts |
| $\Delta P < 0$ | $\Delta\text{OI} > 0$ | **SHORT_BUILDUP** | Bearish aggressive writing/selling of contracts |
| $\Delta P < 0$ | $\Delta\text{OI} < 0$ | **LONG_UNWINDING** | Bulls closing long contracts (support fading) |
| $\Delta P > 0$ | $\Delta\text{OI} < 0$ | **SHORT_COVERING** | Bears covering short contracts (resistance breaking) |

### 2.3 Strike-Level Intraday Gamma Velocity ($\Delta\text{GEX}$)
The net gamma injected into the market by intraday contract migration:
$$\Delta\text{GEX}_{\text{Call}}(K) = \Gamma(K) \times \Delta\text{OI}_{\text{Call}}(K) \times \text{LotSize} \times S^2 \times 0.01$$
$$\Delta\text{GEX}_{\text{Put}}(K) = -\Gamma(K) \times \Delta\text{OI}_{\text{Put}}(K) \times \text{LotSize} \times S^2 \times 0.01$$
$$\text{Net }\Delta\text{GEX}(K) = \Delta\text{GEX}_{\text{Call}}(K) + \Delta\text{GEX}_{\text{Put}}(K)$$

Where:
- Positive $\text{Net }\Delta\text{GEX}$ means today's flow has *increased dealer long gamma* (reinforcing price pins / dampening volatility).
- Negative $\text{Net }\Delta\text{GEX}$ means today's flow has *injected short gamma* (loosening walls / creating breakout conditions).

### 2.4 Gamma Velocity Accumulation Rate
$$\text{Gamma Velocity} = \frac{\sum_K \text{Net }\Delta\text{GEX}(K)}{\Delta t} \quad (\text{₹ Cr / hour})$$

---

## 3. Architecture & Component Structure

```
src/
├── services/
│   └── gex/
│       ├── types.ts (Extended with DeltaOiDetail & BuildUpType)
│       └── oiVelocityEngine.ts (Core calculation & classification engine)
├── components/
│   ├── OiVelocityMatrix.tsx (Dedicated ΔOI & Gamma Velocity chart & breakdown)
│   ├── InstrumentDetail.tsx (Tab 5: "ΔOI & Velocity" integration)
│   └── OptionChainTable.tsx (Intraday ΔOI column & flow badges)
└── test/
    ├── oiVelocityEngine.test.ts (Pure math tests)
    ├── OiVelocityMatrix.test.tsx (UI rendering tests)
    └── App.test.tsx (Integration verification)
```

---

## 4. UI/UX Design Specifications
- **Visual Palette:**
  - Long Build-up: Emerald (`#10b981`)
  - Short Build-up: Rose (`#f43f5e`)
  - Long Unwinding: Amber (`#f59e0b`)
  - Short Covering: Cyan (`#06b6d4`)
- **Interactive Controls:**
  - Toggle between absolute $\Delta\text{OI}$ contracts and $\Delta\text{GEX}$ (₹ Cr).
  - Strike range filter (All strikes vs ATM $\pm 10$ strikes).
