# Stage 3: Conventional GEX Calculation Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a robust, pure, deterministic Black-Scholes Conventional GEX Calculation Engine for Indian index and stock derivatives conforming to DhanHQ data models and AGENTS.md rules.

**Architecture:** A functional mathematical library divided into four modular units: standard normal approximations and Black-Scholes pricing/Greeks, a Newton-Raphson + Bisection IV solver, time-to-expiry and lot-size resolvers, and a full option chain GEX engine calculating strike-level exposure, Net GEX, Call Wall, Put Wall, and Gamma Flip levels.

**Tech Stack:** TypeScript, Vitest, Vite.

## Global Constraints
- Strictly read-only mathematical processing (AGENTS.md Rule 12).
- Prioritize conventional Black-Scholes GEX first; no synthetic or fabricated data (AGENTS.md Rule 11).
- Every task must strictly follow TDD (red-green-refactor) with fresh test assertions.
- Output metrics in Total Share/Contract Gamma ($\sum \Gamma \times \text{OI} \times \text{LotSize}$).

---

### Task 1: Black-Scholes Numerical Core & Greeks

**Files:**
- Create: `src/services/gex/blackScholes.ts`
- Test: `src/test/blackScholes.test.ts`

**Interfaces:**
- Produces:
  - `standardNormalCdf(x: number): number`
  - `standardNormalPdf(x: number): number`
  - `bsCallPrice(S: number, K: number, r: number, T: number, sigma: number): number`
  - `bsPutPrice(S: number, K: number, r: number, T: number, sigma: number): number`
  - `bsGamma(S: number, K: number, r: number, T: number, sigma: number): number`
  - `bsVega(S: number, K: number, r: number, T: number, sigma: number): number`
  - `bsDelta(S: number, K: number, r: number, T: number, sigma: number, type: 'CALL' | 'PUT'): number`

- [ ] **Step 1: Write the failing test**
Create `src/test/blackScholes.test.ts` with precision tests against known standard values (e.g., standard normal CDF $\Phi(0) = 0.5$, $\Phi(1.96) \approx 0.975$, Hull Black-Scholes option pricing benchmarks).

- [ ] **Step 2: Run test to verify it fails**
Run: `pnpm vitest run src/test/blackScholes.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Write implementation**
Create `src/services/gex/blackScholes.ts` implementing Abramowitz & Stegun 7.1.26 rational CDF approximation, PDF, Call/Put pricing, and Greeks ($\Gamma$, $\Delta$, $\nu$).

- [ ] **Step 4: Run test to verify it passes**
Run: `pnpm vitest run src/test/blackScholes.test.ts`
Expected: PASS with 100% assertions green.

- [ ] **Step 5: Commit**
`git add src/services/gex/blackScholes.ts src/test/blackScholes.test.ts`  
`git commit -m "feat(gex): implement Black-Scholes numerical core and analytical Greeks with tests"`

---

### Task 2: Implied Volatility (IV) Numerical Solver

**Files:**
- Create: `src/services/gex/ivSolver.ts`
- Test: `src/test/ivSolver.test.ts`

**Interfaces:**
- Consumes: `bsCallPrice`, `bsPutPrice`, `bsVega` from `src/services/gex/blackScholes.ts`
- Produces:
  - `solveImpliedVolatility(S: number, K: number, r: number, T: number, marketPrice: number, type: 'CALL' | 'PUT'): number`

- [ ] **Step 1: Write the failing test**
Create `src/test/ivSolver.test.ts` testing inversion of known prices back to $\sigma$, convergence on ATM/ITM/OTM calls and puts, and boundary handling for zero or sub-intrinsic prices.

- [ ] **Step 2: Run test to verify it fails**
Run: `pnpm vitest run src/test/ivSolver.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Write implementation**
Create `src/services/gex/ivSolver.ts` implementing hybrid Newton-Raphson + Bisection search, bounded to $[0.01, 5.00]$, with intrinsic value clamping.

- [ ] **Step 4: Run test to verify it passes**
Run: `pnpm vitest run src/test/ivSolver.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**
`git add src/services/gex/ivSolver.ts src/test/ivSolver.test.ts`  
`git commit -m "feat(gex): implement hybrid Newton-Raphson and bisection IV solver with tests"`

---

### Task 3: Time-to-Expiry & Lot Size Resolver

**Files:**
- Create: `src/services/gex/timeToExpiry.ts`
- Create: `src/services/gex/lotSize.ts`
- Test: `src/test/gexUtils.test.ts`

**Interfaces:**
- Produces:
  - `calculateTimeToExpiryYears(expiryDateStr: string, currentDate?: Date): number`
  - `resolveLotSize(symbolOrScrip: string | number, explicitLotSize?: number): number`

- [ ] **Step 1: Write the failing test**
Create `src/test/gexUtils.test.ts` verifying IST 15:30:00 cutoff calculation, minimum time guard ($T_{\min} = 1\text{ min}$), and lot size resolution for indices (`NIFTY`, `BANKNIFTY`, `SENSEX`) and F&O stocks (`RELIANCE`, `TCS`, `INFY`).

- [ ] **Step 2: Run test to verify it fails**
Run: `pnpm vitest run src/test/gexUtils.test.ts`
Expected: FAIL.

- [ ] **Step 3: Write implementation**
Implement `src/services/gex/timeToExpiry.ts` and `src/services/gex/lotSize.ts`.

- [ ] **Step 4: Run test to verify it passes**
Run: `pnpm vitest run src/test/gexUtils.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**
`git add src/services/gex/timeToExpiry.ts src/services/gex/lotSize.ts src/test/gexUtils.test.ts`  
`git commit -m "feat(gex): add IST time-to-expiry calculator and F&O lot size resolver"`

---

### Task 4: GEX Aggregation Engine & Key Structural Levels

**Files:**
- Create: `src/services/gex/types.ts`
- Create: `src/services/gex/engine.ts`
- Create: `src/services/gex/index.ts`
- Test: `src/test/gexEngine.test.ts`

**Interfaces:**
- Consumes:
  - `solveImpliedVolatility`, `bsGamma` from Tasks 1 & 2
  - `calculateTimeToExpiryYears`, `resolveLotSize` from Task 3
  - `NormalizedOptionChain` from `src/services/dhan/types.ts`
- Produces:
  - `calculateOptionChainGex(chain: NormalizedOptionChain, options?: GexEngineOptions): GexCalculationResult`

- [ ] **Step 1: Write the failing test**
Create `src/test/gexEngine.test.ts` with comprehensive option chain fixture data verifying:
1. Strike-level Call, Put, and Net GEX calculations.
2. Aggregate Total Call GEX, Total Put GEX, and Net Total GEX.
3. Call Wall identification (highest positive Call GEX strike).
4. Put Wall identification (highest magnitude Put GEX strike).
5. Gamma Flip interpolation level.
6. Dealer Bias flag (`LONG_GAMMA`, `SHORT_GAMMA`, `NEUTRAL`).
7. Nearest GEX event classification (`APPROACHING`, `TESTING`, `PINNING`, `BREACHED`).

- [ ] **Step 2: Run test to verify it fails**
Run: `pnpm vitest run src/test/gexEngine.test.ts`
Expected: FAIL.

- [ ] **Step 3: Write implementation**
Implement `src/services/gex/types.ts`, `src/services/gex/engine.ts`, and `src/services/gex/index.ts`.

- [ ] **Step 4: Run test to verify it passes**
Run: `pnpm vitest run src/test/gexEngine.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**
`git add src/services/gex/ src/test/gexEngine.test.ts`  
`git commit -m "feat(gex): implement conventional GEX aggregation engine with Call/Put Walls and Gamma Flip"`

---

### Task 5: End-to-End Test Suite, Type Check & Stage 3 Documentation

**Files:**
- Modify: `README.md`
- Verify: All tests across the entire repository

- [ ] **Step 1: Run all tests in repository**
Run: `pnpm test`
Expected: 100% pass across all test suites.

- [ ] **Step 2: Run full production build and type-check**
Run: `pnpm build`
Expected: Exit code 0, 0 linter/type errors.

- [ ] **Step 3: Update documentation**
Update `README.md` with Stage 3 completion details, methodology notes, and roadmap updates.

- [ ] **Step 4: Commit**
`git add README.md`  
`git commit -m "docs: document Stage 3 conventional GEX engine completion"`
