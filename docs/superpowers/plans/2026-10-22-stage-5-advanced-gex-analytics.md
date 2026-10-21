# Stage 5: Advanced Institutional GEX Analytics & Multi-Day Session Intelligence — Implementation Plan

**Goal:** Implement multi-day candlestick charting with previous session GEX benchmark levels, full option chain GEX table with Greek metrics & CSV export, intraday GEX drift tracking, real-time level alerts, and multi-expiry selection.

---

## Logical Sub-Stages

### Stage 5.1: Multi-Day Candlestick History & Previous Session GEX Levels
- Update mock and live intraday data models to supply 3-5 days of 5-minute candles.
- Add `prevDayLevels` to `Instrument` interface (`prevCallWall`, `prevPutWall`, `prevGammaFlip`, `prevClose`).
- Update `CandlestickChart.tsx` to render historical session candles and overlay previous day levels as dashed benchmark price lines.
- Write unit tests for multi-day candle generation and price line formatting.

### Stage 5.2: Full Option Chain GEX Table with Greeks & CSV Export
- Enhance GEX calculation engine and adapter to expose per-strike option chain rows with IV, Delta, Gamma, OI, and Net GEX.
- Create `src/components/OptionChainTable.tsx` with:
  - Call side & Put side tabular layout centered on Strike.
  - Highlighted ATM strike, Call Wall, Put Wall, and Gamma Flip.
  - Strike range filter selector ($\pm 10$, $\pm 20$, All).
  - One-click `Export CSV` generator.
- Add "Option Chain Table" tab to `InstrumentDetail.tsx`.
- Write unit tests in `src/test/OptionChainTable.test.tsx`.

### Stage 5.3: Intraday GEX Drift Tracking
- Create `src/hooks/useGexDriftTracker.ts` to record time-stamped GEX snapshots on each poll update.
- Create `src/components/GexDriftChart.tsx` displaying time-series line chart tracking Spot Price vs Call Wall, Put Wall, and Gamma Flip.
- Add "GEX Drift" tab in `InstrumentDetail.tsx`.
- Write unit tests in `src/test/useGexDriftTracker.test.ts`.

### Stage 5.4: Real-Time Level Alerting Engine
- Create `src/services/alerts/alertEngine.ts` and `src/hooks/useGexAlerts.ts` detecting:
  - Wall approaching ($<0.50\%$)
  - Wall testing ($<0.10\%$)
  - Wall pinning
  - Gamma Flip regime transitions (crossing above / below)
- Create `src/components/AlertsDrawer.tsx` with alert counts, timestamped log, severity badges, and audio chime toggle.
- Integrate alert trigger button and badge in `Navbar.tsx`.
- Write unit tests in `src/test/alertEngine.test.ts`.

### Stage 5.5: Multi-Expiry GEX Aggregation
- Add Expiry Selector dropdown to `InstrumentDetail.tsx` (Current 0DTE/Weekly, Next Weekly, Monthly, All).
- Re-aggregate GEX metrics dynamically based on selected expiry.
- Verify end-to-end integration across all tabs and components.
