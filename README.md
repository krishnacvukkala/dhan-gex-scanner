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
- **Stage 2 (Planned):** DhanHQ API v2 client integration (market quotes, historical data, rate-limit management).
- **Stage 3 (Planned):** Core Black-Scholes conventional GEX calculation engine (Net GEX, Gamma Flip, Call Wall, Put Wall).
- **Stage 4 (Planned):** Real-time WebSocket streaming feed and live dashboard synchronization.
