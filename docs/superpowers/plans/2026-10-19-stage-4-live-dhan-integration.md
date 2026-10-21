# Stage 4: Live DhanHQ API Integration & Dashboard Wiring — Implementation Plan

**Goal:** Integrate the Stage 2 DhanHQ read-only API client and Stage 3 Conventional GEX Engine into the dashboard, enabling users to toggle between simulated mock mode and real-time live DhanHQ data with secure in-browser credential management.

---

## Proposed Incremental Steps

### Step 1: Security Master & Registry (`src/services/dhan/instruments.ts`)
- Define instrument registry mapping dashboard symbols to DhanHQ `underlyingScrip`, `segment`, `lotSize`, and `expiry`.
- Add utility `getInstrumentRegistry()` and `findInstrumentBySymbol()`.
- Write unit tests in `src/test/instrumentRegistry.test.ts`.

### Step 2: Credential Manager (`src/services/dhan/credentialManager.ts`)
- Implement secure storage in `sessionStorage` / `localStorage` with fallback to `import.meta.env`.
- Implement `maskToken(token: string)`.
- Implement `validateConnection(client: DhanApiClient)`.
- Write unit tests in `src/test/credentialManager.test.ts`.

### Step 3: Live GEX Adapter & Scanner Hook (`src/hooks/useLiveGexScanner.ts`)
- Implement option chain polling orchestrator:
  - Fetches option chains for active symbols sequentially or in batched rate-limited calls.
  - Transforms `NormalizedOptionChain` via `calculateOptionChainGex`.
  - Maps `GexCalculationResult` into dashboard `Instrument` models with real Call Wall, Put Wall, Gamma Flip, and Net GEX.
  - Pauses polling when document visibility is hidden.
- Write unit/integration tests in `src/test/useLiveGexScanner.test.ts`.

### Step 4: UI Components (API Settings Modal, Mode Switcher, Strike GEX Profile)
- Create `src/components/ApiSettingsModal.tsx` for entering credentials, configuring poll frequency, and testing connectivity.
- Update `src/components/Navbar.tsx` to include Mode Toggle (`Simulated` vs `Live`), Settings icon, connection status indicator, and manual refresh.
- Update `src/components/InstrumentDetail.tsx` to include a Strike GEX distribution view alongside the candlestick chart.
- Update `src/App.tsx` to wire the `useLiveGexScanner` hook with fallback to mock data when in simulated mode.

### Step 5: Verification & Integration Testing
- Run linter, typecheck (`pnpm build`), and test suite (`pnpm test`).
- Test in browser to verify both Simulated Mode and Live Mode UI interactions.
- Provide stage report following Rule 10 in `AGENTS.md`.
