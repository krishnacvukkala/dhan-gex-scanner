# Stage 5: Advanced Institutional GEX Analytics & Multi-Day Session Intelligence — Architecture & Design

## 1. Executive Summary

Stage 5 expands the Dhan GEX Scanner from real-time single-session monitoring into an institutional-grade decision support platform. It introduces:
1. **Multi-Day Session Charting:** Incorporates 3 to 5 past trading sessions of 5-minute candlestick data alongside previous days' closing GEX levels (Call Wall, Put Wall, Gamma Flip) to assess level respect and historical performance.
2. **Full Interactive Option Chain Table:** Granular strike-by-strike view displaying LTP, OI, IV, Delta ($\Delta$), Gamma ($\Gamma$), Call GEX, Put GEX, and Net GEX with instant CSV/Excel export.
3. **Intraday GEX Drift Tracking:** Time-series snapshot history capturing how key walls and gamma flip migrate over the course of the day.
4. **Real-Time Level Alerts:** Configurable notifications for Wall Approaching, Wall Pinning, and Gamma Flip Regime Transitions (Long $\leftrightarrow$ Short Gamma).
5. **Multi-Expiry GEX Aggregation:** Toggle between Nearest Expiry (0DTE/Weekly), Next Weekly, Monthly, and All Combined Expiries.

---

## 2. Component Architecture

```
                  ┌────────────────────────────────────────┐
                  │              Navbar.tsx                │
                  │  (Alerts Drawer Badge, Mode Switcher)  │
                  └───────────────────┬────────────────────┘
                                      │
                 ┌────────────────────┴────────────────────┐
                 │                App.tsx                  │
                 │   - useLiveGexScanner (Enhanced)        │
                 │   - useGexAlerts (Threshold Engine)     │
                 │   - useGexDriftTracker (Time Series)    │
                 └────────────────────┬────────────────────┘
                                      │
     ┌────────────────────────────────┼────────────────────────────────┐
     ▼                                ▼                                ▼
┌───────────────────────┐ ┌───────────────────────┐ ┌───────────────────────────┐
│  Watchlist Overview   │ │ InstrumentDetail.tsx  │ │    GexAlertsDrawer.tsx    │
│  - Wall Proximity     │ │  Tabs:                │ │  - Active Alerts Log      │
│  - Alert Badges       │ │  1. Price Chart       │ │  - Alert Settings         │
│                       │ │     (Multi-Day OHLCV  │ │    (Audio, Thresholds)    │
│                       │ │      + Past Levels)   │ └───────────────────────────┘
│                       │ │  2. Strike GEX Profile│
│                       │ │  3. Option Chain GEX  │
│                       │ │     Table + CSV       │
│                       │ │  4. GEX Drift History │
│                       │ └───────────────────────┘
```

---

## 3. Detailed Specifications

### A. Multi-Day Session Charting with Historical GEX Levels
- **Data Model:**
  - Standardize 5-minute candle history to cover at least 3-5 trading days (up to ~375-500 five-minute candles).
  - Inject session boundary separators or distinct day markers.
  - Store and plot **Previous Day Levels**:
    - `Prev Day Call Wall` (dashed amber line)
    - `Prev Day Put Wall` (dashed sky blue line)
    - `Prev Day Gamma Flip` (dashed purple line)
    - `Prev Day Close / Settlement`
- **TradingView Lightweight Charts integration:**
  - Use `createPriceLine` with line style `LineStyle.Dashed` and labeled markers.
  - Candlestick series seamlessly displays past days allowing visual verification of how past walls capped or supported prices.

### B. Full Interactive Option Chain Table & Greeks (`OptionChainTable.tsx`)
- **Columns:**
  - **Calls:** Call OI, Call OI Change, Call IV (%), Call Delta ($\Delta$), Call GEX (₹ Cr), Call LTP
  - **Strike Price** (highlighting ATM, Call Wall, Put Wall, Gamma Flip)
  - **Puts:** Put LTP, Put GEX (₹ Cr), Put Delta ($\Delta$), Put IV (%), Put OI Change, Put OI
  - **Net GEX per Strike** (visual bar indicator)
- **Features:**
  - ATM Strike auto-centering button.
  - Strike range filter ($\pm 10$, $\pm 20$, or All strikes).
  - One-click `Export CSV` button generating clean, timestamped file `[SYMBOL]_GEX_OptionChain_[DATE].csv`.

### C. Intraday GEX Drift Tracker (`GexDriftTracker.tsx` & `useGexDriftTracker.ts`)
- **Time-Series State:**
  - Records periodic snapshots: `{ timestamp: string, spotPrice: number, callWall: number, putWall: number, gammaFlip: number, netGexCr: number }`.
  - Captures on every live poll update (default 15s to 1m) and generates 5m/15m session slices.
- **Visual Chart:**
  - Multi-line visualization tracking Spot Price alongside Call Wall, Put Wall, and Gamma Flip over the session timeline.
  - Highlights whether walls are shifting upward (bullish expansion) or compressing inward (dealer pinning).

### D. Real-Time Alerting System (`useGexAlerts.ts` & `AlertsDrawer.tsx`)
- **Alert Types:**
  1. `WALL_APPROACHING`: Spot within $0.25\%$ to $0.50\%$ of Call Wall or Put Wall.
  2. `WALL_TESTING`: Spot testing within $0.10\%$ of Call Wall or Put Wall.
  3. `WALL_PINNED`: Spot hovering $\pm 0.15\%$ for $> 15$ minutes.
  4. `GAMMA_FLIP_CROSS_ABOVE`: Transition from Short Gamma to Long Gamma (mean reversion regime).
  5. `GAMMA_FLIP_CROSS_BELOW`: Transition from Long Gamma to Short Gamma (volatility expansion regime).
- **Notification Interface:**
  - Alert counter badge in Navbar.
  - Slide-out alert drawer displaying timestamped alert log with severity tags (`warning`, `info`, `critical`).
  - Web Audio synthetic chime on critical alert triggers (user toggleable).

### E. Multi-Expiry Aggregation
- **Selector Options:**
  - `Current Weekly / 0DTE` (highest gamma velocity)
  - `Next Weekly`
  - `Monthly Expiry`
  - `All Expirations Combined`
- **Dynamic GEX Re-calculation:**
  - Filters option chain strikes by chosen expiration before aggregating GEX and computing walls.

---

## 4. Verification & Safety Guidelines
- Strict adherence to `AGENTS.md` Non-Negotiable Rules:
  - 100% read-only data, zero order execution.
  - Deterministic calculations without synthetic/fabricated numbers.
  - Comprehensive unit and component tests using Vitest.
