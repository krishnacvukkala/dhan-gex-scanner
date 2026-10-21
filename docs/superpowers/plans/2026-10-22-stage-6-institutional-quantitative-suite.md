# Stage 6: Institutional Quantitative Suite — Implementation Plan

**Goal:** Implement Net Delta Exposure (DEX) & 1% move dealer hedging matrix, Cross-Index Gamma Radar & Heatmap, Segregated Experimental PC-GEX mode, and Daily Session Recap report generator.

---

## Logical Sub-Stages

### Step 6.1: Net Delta Exposure (DEX) & 1% Hedging Matrix Engine
- Create `src/services/gex/dexEngine.ts`:
  - Calculate Call DEX, Put DEX, and Net DEX per strike and aggregate chain total.
  - Calculate Dealer Hedging Flow required per 1% spot move (₹ Cr / 1%).
- Add DEX & Hedging Flow metrics to `InstrumentDetail.tsx`.
- Write unit tests in `src/test/dexEngine.test.ts`.

### Step 6.2: Segregated Experimental PC-GEX Model (Rule 11)
- Create `src/services/gex/pcGexEngine.ts`:
  - Compute Put-Call / Positional-Cash Gamma Exposure.
  - Flag calculation clearly with `[EXPERIMENTAL]`.
- Add GEX Calculation Model toggle in `InstrumentDetail.tsx`:
  - `Conventional GEX` (standard) vs `PC-GEX (Experimental)`
  - Persistent warning banner and explanation.
- Write unit tests in `src/test/pcGexEngine.test.ts`.

### Step 6.3: Cross-Index Institutional Gamma Radar & Heatmap
- Create `src/components/CrossIndexRadar.tsx`:
  - Institutional grid comparing NIFTY 50, BANKNIFTY, FINNIFTY, MIDCPNIFTY, and SENSEX.
  - Displays Spot, Net GEX, Net DEX, Nearest Wall, Distance %, Gamma Regime status, and 1% Hedging Flow.
- Add Radar view button in `Navbar.tsx` and main dashboard.
- Write unit tests in `src/test/CrossIndexRadar.test.tsx`.

### Step 6.4: Daily Session Recap & Trade Journal Report
- Create `src/components/SessionRecapModal.tsx`:
  - Calculates Level Respect score (% of touches where walls held).
  - Displays chronological breach/test events.
  - Generates printable / PDF-ready report and JSON download.
- Add "Session Recap" button to header.
- Write unit tests in `src/test/SessionRecapModal.test.tsx`.

### Step 6.5: End-to-End Verification & Commit
- Run test suites (`npm test`) and typecheck/build (`npm run build`).
- Verify in browser using subagent and record visual walkthrough.
- Commit cleanly following rules in `AGENTS.md`.
