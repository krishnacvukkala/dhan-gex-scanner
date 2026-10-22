# Stage 8 Implementation Plan: 0DTE Expiry Pin Probability & Magnetic Strike Forecaster

## Step 1: Types Extension
- Update `src/services/gex/types.ts`:
  - `GravityDirection`: `'BULLISH_PULL' | 'BEARISH_PULL' | 'PINNED'`
  - `PinConfidence`: `'HIGH' | 'MODERATE' | 'DISPERSED'`
  - `StrikePinDetail`:
    - `strike: number`
    - `pinProbabilityPct: number`
    - `cumulativeProbPct: number`
    - `gexConcentrationPct: number`
    - `dealerLossCr: number`
    - `compositePinScore: number`
    - `isDominantPin: boolean`
    - `isMaxPain: boolean`
  - `PinForecastResult`:
    - `dominantPinStrike: number`
    - `maxPainStrike: number`
    - `pinConfidence: PinConfidence`
    - `gravityVector`:
      - `targetStrike: number`
      - `distancePts: number`
      - `distancePct: number`
      - `direction: GravityDirection`
      - `pullForceCr: number`
    - `strikes: StrikePinDetail[]`

## Step 2: Mathematical Engine Implementation & Tests (TDD)
- Create `src/services/gex/pinProbabilityEngine.ts`:
  - `calculateMaxPain(strikes: StrikeGexDetail[]): number`
  - `calculatePinProbabilities(strikes: StrikeGexDetail[], spot: number, timeToExpiryYears: number, riskFreeRate?: number): PinForecastResult`
- Create `src/test/pinProbabilityEngine.test.ts`:
  - Test Max Pain calculation with asymmetrical call/put open interest.
  - Test probability distribution summing to 100%.
  - Test gravity vector direction and distance calculations.
  - Test zero or low time-to-expiry boundary conditions.

## Step 3: Interactive UI Component (`PinProbabilityForecaster.tsx`)
- Create `src/components/PinProbabilityForecaster.tsx`:
  - 4 KPI summary cards (Dominant Pin Magnet, Max Pain, Gravity Pull Vector, Pin Confidence).
  - Expiry Scenario Simulator buttons (Normal, 2 Hours to Expiry, 45 Mins to Expiry, 15 Mins to Expiry).
  - Dual Visualizations:
    - Expiry Probability Curve / Distribution Bar Graphic centered at Spot with Max Pain and Pin Strike markers.
    - Strike Pin Probability Heatmap & Dealer Loss Matrix table with CSV export.
- Create `src/test/PinProbabilityForecaster.test.tsx`:
  - Verifies KPI rendering, scenario changing, and table display.

## Step 4: Dashboard & Modal Integration
- Wire Tab 6 (`0DTE Pin Forecaster`) into `src/components/InstrumentDetail.tsx`.
- Update `src/test/InstrumentDetail.test.tsx` for Tab 6 navigation.
- Add CSS styling in `src/index.css`.

## Step 5: Verification & Stage Reporting
- Run `npx vitest run`.
- Run `npm run build`.
- Conduct browser subagent verification and capture walkthrough artifact.
- Update `README.md`.
- Inspect git status and diff, then commit following Rule 10.
