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
- **Stage 3 (Next):** Core Conventional GEX Calculation Engine (Black-Scholes d1/d2, Gamma $\Gamma$, Net GEX per strike, Call Wall, Put Wall, Gamma Flip, Dealer Bias).
- **Stage 4 (Planned):** End-to-end integration: Live Dhan option chain polling/WebSocket streaming into dashboard.

