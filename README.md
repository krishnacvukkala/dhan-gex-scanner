# Dhan API GEX Scanner

Real-time and periodic Gamma Exposure (GEX) scanner and analytics dashboard for Indian equity indices and F&O derivatives using the DhanHQ API.

---

## Stage 1: Frontend Dashboard (Mock Simulation Mode)

Stage 1 implements the interactive frontend user interface using simulated mock data. No connection to live DhanHQ API endpoints or order execution logic is active.

### Key Capabilities

- **Modern Dark-Themed UI:** Tailored for institutional/pro trader ergonomics with high-contrast palette, tabular mono typography, and responsive layouts.
- **Support & Resistance Watchlists:**
  - **Support Watchlist:** Monitors strikes where dealer put wall defenses and gamma flip levels act as price buffers.
  - **Resistance Watchlist:** Tracks strikes where dealer call walls pin prices and cap upward momentum.
- **Instrument Coverage:**
  - Indices: **NIFTY 50**, **BANKNIFTY**
  - F&O Stocks: **RELIANCE**, **HDFCBANK**, **INFY**, **ICICIBANK**, **TCS**, **SBIN**, **TATAMOTORS**, **BHARTIARTL**
- **Watchlist Metrics:** Symbol, Last Price, Nearest GEX Level (Strike), Distance (pts / %), Event Status, and Data Freshness.
- **Interactive Detail Modal:** Clicking any instrument opens a drill-down view showing:
  - Intraday price range progress (Low to High).
  - Call Wall (major resistance), Put Wall (major support), Gamma Flip (zero gamma pivot).
  - Net GEX (₹ Cr) and Dealer Gamma Bias (Long Gamma mean-reverting vs. Short Gamma volatility-accelerating).
  - 5-minute Candlestick Chart with Volume bars and horizontal GEX level overlays.
- **Filter Controls:** Filter by instrument type (All, Indices, F&O Stocks), Event Status (Approaching, Testing, Pinning, Breached), and instant search.
- **Review States:** Interactive switcher to inspect Normal, Loading skeleton, Error state with retry action, and Empty state.
- **Strict Labeling:** All mock indicators and synthetic price profiles are explicitly labeled as simulated.

---

## Stage 2: DhanHQ API Client & Data Access Layer (Completed)

Stage 2 implements the safe, typed, read-only API client interface for DhanHQ API v2.

### Key Capabilities
- **Strict Read-Only Enforcement (Rule 12):** Explicit execution guard preventing any order placement, trade, modification, or cancellation endpoints.
- **Market Data Endpoints:**
  - `getOptionChain`: Fetches full strike chain for indices and F&O underlyings and normalizes strikes ascending.
  - `getQuotes`: Batch market quotes for exchange segments and security IDs.
  - `getIntradayCandles`: Historical 5-minute candlestick bars with OHLCV data.
  - `getExpiryList`: Contract expiration date discovery.
- **Resilience & Rate Limiting:**
  - Token Bucket rate limiter adhering to DhanHQ throughput limits (~10 req/s).
  - Exponential backoff retry logic for HTTP 429 and transient 5xx network errors.
- **Security & Hygiene (Rules 6 & 7):**
  - Safe credential loading from environment variables (`.env` gitignored).
  - Credential masking utility for diagnostics.
  - Typed error hierarchy (`DhanAuthError`, `DhanRateLimitError`, `DhanNotFoundError`, `DhanMarketClosedError`).

---

## Stage 3: Conventional GEX Calculation Engine (Completed)

Stage 3 implements the pure, deterministic mathematical core for calculating conventional Black-Scholes Greeks and aggregate Gamma Exposure (GEX) for Indian index and stock derivatives.

### Key Capabilities
- **Black-Scholes Numerical Core (`src/services/gex/blackScholes.ts`):**
  - High-precision Abramowitz & Stegun 7.1.26 polynomial approximation for Standard Normal CDF $\Phi(x)$ (error $< 1.5 \times 10^{-7}$).
  - European Call and Put pricing functions strictly satisfying Put-Call Parity.
  - Analytical Greeks: Gamma ($\Gamma$), Delta ($\Delta$), and Vega ($\nu$).
- **Implied Volatility (IV) Numerical Solver (`src/services/gex/ivSolver.ts`):**
  - Solves theoretical IV directly from traded option market price using a hybrid Newton-Raphson + Bisection method.
  - Graceful boundary handling for zero, deep ITM/OTM, or sub-intrinsic prices without throwing `NaN`.
- **Time-to-Expiry & Lot Size Resolution (`src/services/gex/`):**
  - Precise annualized time-to-expiry $T$ targeting 15:30:00 IST on contract expiration date.
  - Dynamic lot size resolver prioritizing Dhan metadata with complete fallback lookup for indices (NIFTY, BANKNIFTY, SENSEX, etc.) and F&O equities (RELIANCE, TCS, INFY, HDFCBANK, etc.).
- **GEX Aggregation Engine (`src/services/gex/engine.ts`):**
  - Computes Call GEX ($+\Gamma \times \text{Call OI} \times \text{LotSize}$), Put GEX ($-\Gamma \times \text{Put OI} \times \text{LotSize}$), and Net GEX per strike.
  - Identifies **Call Wall** (major dealer resistance), **Put Wall** (major dealer support), and interpolates **Gamma Flip** level.
  - Categorizes **Dealer Gamma Bias** (`LONG_GAMMA`, `SHORT_GAMMA`, `NEUTRAL`) and nearest GEX level proximity (`APPROACHING`, `TESTING`, `PINNING`, `BREACHED`).
- **Comprehensive Test Coverage:** 51 total tests in repository across 6 test suites covering mathematical edge cases, boundary conditions, and option chain scenarios.

---

## Stage 4: Live DhanHQ Integration & Dashboard Wiring (Completed)

Stage 4 integrates the Stage 2 DhanHQ read-only API client and Stage 3 Conventional GEX Engine into the interactive dashboard, enabling seamless live polling and in-browser credential management.

### Key Capabilities
- **Simulated vs. Live Mode Switching:** Instant toggle between simulated demonstration mode and real-time live DhanHQ data.
- **Client-Side Credential Security (Rules 6 & 7):**
  - In-browser settings modal for DhanHQ Client ID and Access Token (JWT).
  - Configurable storage persistence (`sessionStorage` for ephemeral security vs. `localStorage`).
  - Diagnostic token masking (`eyJ...****`) and on-demand connectivity ping test.
- **Security Master & Index Registry:** Pre-configured mappings for Indian indices (`NIFTY 50`, `BANKNIFTY`, `FINNIFTY`, `MIDCPNIFTY`, `SENSEX`) with official security IDs, lot sizes, and strike step sizes.
- **Dynamic Strike GEX Profile Chart:** Strike-by-strike Gamma Exposure bar visualization (Call GEX, Put GEX, Net GEX) with Call Wall, Put Wall, and Gamma Flip benchmark lines alongside the candlestick price chart.
- **Live GEX Polling Engine (`useLiveGexScanner`):**
  - Rate-limited sequential polling respecting DhanHQ API quotas.
  - Automatic visibility throttling (pauses when browser tab is backgrounded).
  - Live data freshness timestamps and manual on-demand refresh.
- **Comprehensive Test Coverage:** 77 total tests in repository across 11 test suites covering credential management, instrument registry, live adapter, API settings modal, and dashboard interactions.

---

## Stage 5: Advanced Institutional GEX Analytics & Multi-Day Intelligence (Completed)

Stage 5 enhances the scanner with historical session context, multi-expiry filtering, full option chain tables with Greeks, intraday drift tracking, and a real-time alerting engine.

### Key Capabilities
- **Multi-Day 5-Minute Candlestick Charting with Prior Session GEX Levels:**
  - 3 full trading sessions of 5-minute candles showing historical price action.
  - Interactive **Prior Session Toggle (`Prior Session: ON / OFF`)** displaying previous day benchmark levels (`PREV CALL WALL`, `PREV PUT WALL`, `PREV FLIP`, and `PREV CLOSE`).
- **Full Interactive Option Chain Table & Greeks:**
  - Tabular option chain centered around Strike Price with Open Interest, LTP, Implied Volatility (IV %), Delta ($\Delta$), Gamma ($\Gamma$), Call GEX, Put GEX, and Net GEX.
  - Color-coded badges for `ATM`, `CALL WALL`, `PUT WALL`, and `GAMMA FLIP`.
  - Strike range selector (`ATM ±10`, `ATM ±15`, `ATM ±20`, `All Strikes`) and live strike search filter.
  - One-click **Export CSV** download with timestamped filenames (`[SYMBOL]_GEX_Option_Chain_[DATE].csv`).
- **Intraday GEX Drift Tracking:**
  - Dedicated time-series SVG chart tracking the migration of Spot Price against Call Wall, Put Wall, and Gamma Flip across 30-minute session intervals.
  - Summary analytics diagnosing whether dealer walls are expanding higher or compressing lower.
- **Real-Time GEX Level Alerting System:**
  - Background scanning engine detecting Critical Wall Testing ($\le 0.15\%$), Wall Approaching ($\le 0.50\%$), and Gamma Flip Regime Transitions.
  - Slide-out alert drawer with severity filter pills, Web Audio synthetic chime toggle, and unread count badge in Navbar.
- **Multi-Expiry Selection:**
  - Contract expiration dropdown supporting Weekly (0DTE/Current), Next Weekly, Monthly, and All Combined Expiries.
- **Robust Test Coverage:** 88 total automated unit and component tests passing across 14 test suites in Vitest.

---

## Chart Library Evaluation & Choice

### Chosen: **TradingView Lightweight Charts (`lightweight-charts`)**

**Rationale:**
1. **Performance & Footprint:**
   - Weighs only ~45 KB gzipped with zero external dependencies.
   - Leverages HTML5 Canvas for fast rendering, supporting 60 FPS scrolling and panning even with tick updates.
2. **First-Class Financial Primitives:**
   - Native support for candlestick bars and synchronized volume histograms on dual price scales.
   - Built-in `createPriceLine` API, ideal for overlaying key GEX structural levels (Call Wall, Put Wall, Gamma Flip, and Spot).
3. **Institutional UI Consistency:**
   - Matches the standard charting look-and-feel familiar to Indian derivative and index traders.
4. **Maintenance & Stability:**
   - Actively maintained by TradingView with full TypeScript support and minimal memory overhead.

---

## Development & Testing

---

## Stage 6: Institutional Quantitative Suite & Segregated Experimental Models (Completed)

Stage 6 delivers advanced quantitative hedging metrics, cross-index benchmarking, segregated experimental models in strict compliance with Rule 11, and session audit reporting.

### Key Capabilities

- **Net Delta Exposure (DEX) & 1% Move Re-hedging Requirement Matrix (`src/services/gex/dexEngine.ts`):**
  - Aggregates directional dealer delta inventory: $\text{Call DEX} = \Delta_C \times \text{Call OI} \times \text{LotSize} \times \text{Spot}$ and $\text{Put DEX} = \Delta_P \times \text{Put OI} \times \text{LotSize} \times \text{Spot}$.
  - Determines total market-wide dealer re-hedging flows per 1% price move: $(\lvert\text{Net GEX}\rvert \times \text{Spot} \times 0.01) / 10^7$ in ₹ Cr.
  - Classifies dynamic hedging action: *Dealers Sell Rallies / Buy Dips* (volatility suppressing) vs. *Dealers Buy Rallies / Sell Dips* (volatility expanding / trend following).
- **Cross-Index Institutional Gamma Radar & Heatmap (`src/components/CrossIndexRadar.tsx`):**
  - Multi-asset dashboard overlay covering Indian benchmark indices: **NIFTY 50**, **BANKNIFTY**, **FINNIFTY**, **MIDCPNIFTY**, and **SENSEX**.
  - Market-wide gamma regime aggregation (dampening vs. expansion), combined net GEX, level distances, and instant instrument drilldown.
- **Rule 11 Segregated Experimental PC-GEX Model (`src/services/gex/pcGexEngine.ts`):**
  - Positional-Cash / Put-Call Gamma Exposure engine cleanly segregated from conventional Black-Scholes risk metrics.
  - Interactive model switcher pill in detail view with amber warning banner explicitly identifying experimental assumptions.
  - Never synthesizes missing order flow or footprint data.
- **Daily Session Recap & Audit Journal (`src/components/SessionRecapModal.tsx`):**
  - Calculates end-of-session Wall Respect Rate (%) comparing closing prices against Call/Put walls.
  - Granular breakdown of held, tested (pinned within 0.3%), and breached levels.
  - One-click browser print / PDF export and downloadable structured JSON audit file.
- **Robust Automated Verification:** 102 automated tests across 19 test files with 100% pass rate and clean production builds.

---

---

## Stage 7: Real-Time ΔOI Buildup Matrix & Intraday Gamma Velocity (Completed)

Stage 7 implements high-frequency derivative flow analytics, tracking intraday open interest changes ($\Delta\text{OI}$), institutional participant positioning classification, and gamma velocity ($d\text{GEX}/dt$) injected by today's open interest migration.

### Key Capabilities

- **Institutional Open Interest Buildup Engine (`src/services/gex/oiVelocityEngine.ts`):**
  - Mathematical classification of call and put strike positioning based on synchronized price and open interest deltas:
    - $\Delta P > 0, \Delta\text{OI} > 0 \implies$ **Long Build-up** (Aggressive bullish buying)
    - $\Delta P < 0, \Delta\text{OI} > 0 \implies$ **Short Build-up** (Aggressive bearish writing / resistance creation)
    - $\Delta P < 0, \Delta\text{OI} < 0 \implies$ **Long Unwinding** (Bulls exiting / support deterioration)
    - $\Delta P > 0, \Delta\text{OI} < 0 \implies$ **Short Covering** (Short squeeze / resistance capitulation)
  - Color-coded badges with institutional badges across tables and graphics.
- **Intraday Gamma Velocity Metric ($d\text{GEX}/dt$):**
  - Isolates the exact gamma exposure injected or drained purely by today's net new open interest migration:
    $$\Delta\text{GEX}_{\text{strike}} = \frac{\Gamma \times \Delta\text{OI} \times \text{LotSize} \times \text{Spot}^2 \times 0.01}{10^7} \quad (\text{₹ Cr})$$
  - Pinpoints whether dealer gamma walls are actively fortifying or breaking down intraday.
- **Interactive $\Delta\text{OI}$ & Gamma Velocity Matrix (`src/components/OiVelocityMatrix.tsx`):**
  - Integrated as **Tab 5** inside the `InstrumentDetail` modal with instant switching.
  - **4 Top KPI Cards:** Total Call $\Delta\text{OI}$, Total Put $\Delta\text{OI}$, Net Flow Velocity (₹ Cr), and Dominant Buildup Regime.
  - **Dual-Sided Put vs. Call Bar Graphic:** Visualizes Put $\Delta\text{OI}$ on the left and Call $\Delta\text{OI}$ on the right, centered around the strike ladder with ATM marker.
  - **Metric Mode Switcher:** Toggle bars between **Contracts ($\Delta\text{OI}$)** and **Gamma Velocity ($\Delta\text{GEX}$ ₹ Cr)**.
  - **Strike Range Filter:** Quick toggles for `ATM ±10`, `ATM ±15`, `ATM ±20`, or `All Strikes`.
  - **Granular Flow Audit Table:** Strike-by-strike breakdown with Call/Put $\Delta\text{OI}$, LTP Changes ($\Delta P$), Flow Classification badges, and Strike Velocity.
- **Option Chain Table Integration:**
  - Integrated intraday $\Delta\text{OI}$ contract counts directly beneath Call OI and Put OI in `OptionChainTable.tsx` formatted with `+`/`-` and green/red cues.
  - Added `Call_Chg_OI` and `Put_Chg_OI` columns to the downloadable CSV export.
- **Robust Automated Verification:** 113 automated tests passing across 21 test suites in Vitest with zero failures.

---

## Stage 8: 0DTE Expiry Pin Probability & Magnetic Strike Forecaster (Completed)

Stage 8 implements quantitative expiration day pinning analytics and risk-neutral probability distributions for Indian index and derivative contracts.

### Key Capabilities

- **Institutional Max Pain Engine (`src/services/gex/pinProbabilityEngine.ts`):**
  - Evaluates cumulative dealer financial payout across all candidate strikes:
    $$\text{Dealer Loss}(K_j) = \sum_{i} \left[ \max(0, K_j - K_i) \times \text{Call OI}_i + \max(0, K_i - K_j) \times \text{Put OI}_i \right] \times \text{LotSize}$$
  - Determines exact Max Pain level (dealer loss minimization) in ₹ Cr and proximity to current spot price.
- **Risk-Neutral Expiry Price Probability Density:**
  - Implements log-normal strike probability integration across strike slices $[K - \frac{\Delta K}{2}, K + \frac{\Delta K}{2}]$ targeting 15:30 IST:
    $$P(K) = \Phi(d_2(K_1)) - \Phi(d_2(K_2))$$
  - Normalized across all option strikes to ensure $\sum P(K) = 100\%$.
- **Composite Strike Pin Likelihood & Magnetic Score:**
  - Multi-factor model weighting risk-neutral density (45%), absolute GEX concentration (35%), and Max Pain proximity (20%).
  - Pin Confidence Index dynamically categorized into `HIGH` (tight pinning corridor), `MODERATE`, or `DISPERSED` (trend/breakout regime).
- **Dealer Gravity Vector / Net Pin Pull:**
  - Quantifies whether dealer delta-neutral inventory exerts an upward or downward gravitational pull on spot price:
    - Direction: `BULLISH_PULL` ($\uparrow$), `BEARISH_PULL` ($\downarrow$), or `PINNED` ($\pm 20\%$ corridor anchor).
    - Magnitude: Target Strike, distance (pts / %), and dealer pull force in ₹ Cr.
- **Interactive Tab 6 (`PinProbabilityForecaster.tsx`):**
  - **4 Top KPI Cards:** Dominant Pin Magnet, Max Pain Level, Dealer Gravity Vector, and Pin Confidence Index.
  - **Expiry Horizon Simulator:** Interactive scenario switcher for `Live/Current`, `2h to Expiry`, `45m to Expiry`, and `15m Pin Convergence`.
  - **Visual Probability Density & Magnet Curve:** Strike bar graphic centered at Spot with visual benchmark tags for Pin Magnet, Max Pain, ATM, Call Wall, and Put Wall.
  - **Granular Audit Table & CSV Export:** Strike-by-strike breakdown with Pin Probability %, Cumulative Prob %, GEX Concentration %, Dealer Loss (₹ Cr), Composite Pin Score, and one-click timestamped CSV download.
- **Robust Automated Verification:** 124 automated tests passing across 23 test suites in Vitest with 100% pass rate.

---

## Getting Started

### Prerequisites
- Node.js >= 20
- `pnpm` (or `npm`)

### Installation
```bash
pnpm install
```

### Run Local Development Server
```bash
pnpm dev
```

### Run Automated Tests
```bash
pnpm test
```

### Build Production Bundle
```bash
pnpm build
```

---

## Architecture Roadmap

- **Stage 1 (Completed):** Interactive dark-mode dashboard with mock data, 5-min candlestick charts, GEX overlays, and automated UI test coverage.
- **Stage 2 (Completed):** DhanHQ API v2 read-only client with rate limiting, exponential backoff, option chain normalization, and test suite.
- **Stage 3 (Completed):** Core Conventional GEX Calculation Engine (Black-Scholes d1/d2, Gamma $\Gamma$, theoretical IV solver, Net GEX per strike, Call Wall, Put Wall, Gamma Flip, Dealer Bias).
- **Stage 4 (Completed):** Live Dhan option chain polling & in-browser credential configuration, dynamic Strike GEX Profile charts, and dashboard integration.
- **Stage 5 (Completed):** Multi-day session charting with prior session levels, full Option Chain Table with Greeks & CSV export, Intraday GEX Drift tracking, Real-Time Alerts drawer, and multi-expiry selection.
- **Stage 6 (Completed):** Net Delta Exposure (DEX) & 1% re-hedging matrix, Cross-Index Institutional Gamma Radar & Heatmap, Segregated Experimental PC-GEX Model (Rule 11), and Daily Session Recap & Audit Journal.
- **Stage 7 (Completed):** Real-Time $\Delta\text{OI}$ Buildup Matrix, Intraday Gamma Velocity ($d\text{GEX}/dt$), dual-sided Put/Call bar graphic, and Option Chain flow indicators.
- **Stage 8 (Completed):** 0DTE Expiry Pin Probability & Magnetic Strike Forecaster, Max Pain loss minimization, Risk-Neutral Expiry Density, Dealer Gravity Vector, and multi-horizon convergence simulator.




