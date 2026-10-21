# Stage 7 Implementation Plan: Real-Time Change in OI (ΔOI) & Gamma Velocity Matrix

## Phase 1: Mathematical Core & Types
- [ ] Task 1.1: Extend `src/services/gex/types.ts` with `BuildUpType`, `StrikeDeltaOiDetail`, and `OiVelocityResult`.
- [ ] Task 1.2: Implement `src/services/gex/oiVelocityEngine.ts` with:
  - `classifyBuildUp(priceChange: number, oiChange: number): BuildUpType`
  - `calculateStrikeOiVelocity(strikes: StrikeGexDetail[], spot: number, lotSize: number): OiVelocityResult`
- [ ] Task 1.3: Add unit tests in `src/test/oiVelocityEngine.test.ts`.

## Phase 2: Component Implementation
- [ ] Task 2.1: Build `src/components/OiVelocityMatrix.tsx` rendering:
  - Summary cards: Net Intraday $\Delta\text{GEX}$ (₹ Cr), Top Call Accumulation Strike, Top Put Accumulation Strike, Dominant Intraday Flow.
  - Interactive dual bar chart for Call $\Delta\text{OI}$ vs Put $\Delta\text{OI}$ with visual Zero line.
  - Granular strike table with flow badges (Long Build-up, Short Build-up, Unwinding, Covering).
- [ ] Task 2.2: Add unit tests in `src/test/OiVelocityMatrix.test.tsx`.

## Phase 3: Dashboard & InstrumentDetail Integration
- [ ] Task 3.1: Update `src/components/InstrumentDetail.tsx`:
  - Add Tab 5: "ΔOI & Gamma Velocity".
  - Wire `OiVelocityMatrix` into the tab panel.
- [ ] Task 3.2: Update `src/components/OptionChainTable.tsx` to optionally display $\Delta\text{OI}$ badges on Call and Put columns.
- [ ] Task 3.3: Add styling in `src/index.css`.

## Phase 4: Verification, Testing & Commit
- [ ] Task 4.1: Run `npm test` and verify 100% test pass rate across all suites.
- [ ] Task 4.2: Run `npm run build` (`tsc && vite build`).
- [ ] Task 4.3: Verify in browser with `browser_subagent` and capture walkthrough screenshots.
- [ ] Task 4.4: Document in `README.md` and commit following Rule 10.
