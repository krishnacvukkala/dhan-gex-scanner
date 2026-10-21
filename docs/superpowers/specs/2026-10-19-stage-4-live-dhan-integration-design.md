# Stage 4: Live DhanHQ API Integration & Dashboard Wiring — Design Spec

**Date:** 2026-10-19  
**Status:** In Progress / Plan Review  
**Scope:** Stage 4 — Live DhanHQ Option Chain Polling, In-Browser Credential Management, Real-Time GEX Engine Wiring, and Dashboard UI Integration.

---

## 1. Objectives & Non-Negotiable Constraints

- Connect the Stage 2 DhanHQ Read-Only API client (`src/services/dhan/client.ts`) and the Stage 3 Conventional GEX Engine (`src/services/gex/engine.ts`) to the React dashboard (`src/App.tsx`).
- **Rule 6 & 7 (AGENTS.md):** Strict secrets protection. Never commit tokens, never leak credentials to logs or server-side relays. In-browser credential management with masking and session-level storage.
- **Rule 11 (AGENTS.md):** Data integrity. Conventional GEX first. Never fabricate missing strikes or synthetic OI in live mode.
- **Rule 12 (AGENTS.md):** Absolute zero order placement or capital execution endpoints. Read-only market data only.

---

## 2. Architecture & Component Decomposition

```mermaid
graph TD
    UI[Dashboard App.tsx] --> ModeSwitch{Mode Switcher}
    ModeSwitch -->|Simulated| MockData[src/data/mockData.ts]
    ModeSwitch -->|Live Dhan| LiveScanner[useLiveGexScanner Hook]
    
    LiveScanner --> CredMgr[Credential Manager]
    LiveScanner --> Poller[Polling Service / Scheduler]
    
    Poller --> DhanClient[DhanApiClient (Stage 2)]
    DhanClient -->|getOptionChain| RawChain[Option Chain Response]
    DhanClient -->|getIntradayCandles| RawCandles[Intraday 5m Candles]
    
    RawChain --> GexEngine[calculateOptionChainGex (Stage 3)]
    GexEngine --> AggregatedGex[GexCalculationResult]
    
    AggregatedGex --> Normalizer[Live Instrument Adapter]
    RawCandles --> Normalizer
    Normalizer --> UI
```

---

## 3. Detailed Specifications

### 3.1 Security Master Registry (`src/services/dhan/instruments.ts`)
Map standard dashboard symbols to DhanHQ `UnderlyingScrip` IDs and `UnderlyingSeg`:
- **NIFTY**: UnderlyingScrip `13`, UnderlyingSeg `'IDX_I'`, LotSize `75` (current standard 2026 lot size), Display Name `"NIFTY 50"`.
- **BANKNIFTY**: UnderlyingScrip `25`, UnderlyingSeg `'IDX_I'`, LotSize `30`, Display Name `"BANK NIFTY"`.
- **FINNIFTY**: UnderlyingScrip `27`, UnderlyingSeg `'IDX_I'`, LotSize `65`, Display Name `"NIFTY FINANCIAL SERVICES"`.
- **MIDCPNIFTY**: UnderlyingScrip `44`, UnderlyingSeg `'IDX_I'`, LotSize `120`, Display Name `"NIFTY MIDCAP SELECT"`.
- **SENSEX**: UnderlyingScrip `51`, UnderlyingSeg `'IDX_I'`, LotSize `20`, Display Name `"BSE SENSEX"`.
- **F&O Stocks**:
  - `RELIANCE`: UnderlyingScrip `2885`, Segment `'NSE_EQ'`, LotSize `250`
  - `HDFCBANK`: UnderlyingScrip `1333`, Segment `'NSE_EQ'`, LotSize `550`
  - `INFY`: UnderlyingScrip `1594`, Segment `'NSE_EQ'`, LotSize `400`
  - `ICICIBANK`: UnderlyingScrip `4963`, Segment `'NSE_EQ'`, LotSize `700`
  - `TCS`: UnderlyingScrip `11536`, Segment `'NSE_EQ'`, LotSize `175`
  - `SBIN`: UnderlyingScrip `3045`, Segment `'NSE_EQ'`, LotSize `1500`
  - `TATAMOTORS`: UnderlyingScrip `3456`, Segment `'NSE_EQ'`, LotSize `1425`
  - `BHARTIARTL`: UnderlyingScrip `317`, Segment `'NSE_EQ'`, LotSize `950`

### 3.2 In-Browser Credential Manager (`src/services/dhan/credentialManager.ts`)
- Hierarchy of credential discovery:
  1. User-configured credentials in `sessionStorage` (or optional persistent `localStorage`).
  2. Vite environment variables (`import.meta.env.VITE_DHAN_CLIENT_ID`, `import.meta.env.VITE_DHAN_ACCESS_TOKEN`).
- Functions:
  - `getStoredCredentials(): DhanConfig | null`
  - `saveCredentials(clientId: string, accessToken: string, remember: boolean): void`
  - `clearCredentials(): void`
  - `maskToken(token: string): string`
  - `validateConnection(client: DhanApiClient): Promise<boolean>`

### 3.3 Live Scanner Hook (`src/hooks/useLiveGexScanner.ts`)
- State management:
  - `isLiveMode`: boolean (toggle between Simulated Mock Mode and Live Mode)
  - `connectionStatus`: `'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'ERROR' | 'RATE_LIMITED'`
  - `instruments`: Instrument[]
  - `lastSyncTime`: Date | null
  - `isPolling`: boolean
  - `pollInterval`: number (default: 15 seconds)
  - `error`: string | null
- Lifecycle:
  - On mount / mode change: if in live mode and credentials available, fetch initial option chains for active symbols.
  - Automatically pause polling when browser tab is inactive (`document.visibilityState === 'hidden'`).
  - Gracefully handle API errors, rate limit throttles, or off-market hours without crashing the UI.

### 3.4 UI Components & Interactions
1. **Mode Switcher & Status Bar (`src/components/Navbar.tsx`):**
   - Toggle: `[ Simulated Mock ]` vs `[ Live DhanHQ ]`.
   - Settings Gear Button: Opens API Credentials Modal.
   - Status Indicator: Dot (Green = Live / Polling, Yellow = Reconnecting / Rate Limited, Red = Auth Error, Grey = Simulated).
   - "Refresh Now" manual trigger button.
2. **API Credentials & Settings Modal (`src/components/ApiSettingsModal.tsx`):**
   - Fields: Client ID, Access Token (with visibility toggle), Polling Frequency (5s, 15s, 30s, 60s), Remember credentials toggle.
   - Test Connection button with visual feedback.
   - Help text linking to Dhan Developer Portal.
3. **Live Indicator Banner (`src/components/LiveBanner.tsx`):**
   - In Live Mode: Shows active expiry date, total scanned strikes, dealer bias, and last sync timestamp.
   - In Simulated Mode: Displays mock simulation warning.
4. **Enhanced Instrument Detail Modal:**
   - In addition to the Candlestick chart and GEX overlays, display a **Strike GEX Table / Profile** showing Net GEX per strike, Call OI, Put OI, and IV directly computed by the Stage 3 engine.

---

## 4. Test Strategy
- Unit tests for `instruments.ts` registry resolution.
- Unit tests for `credentialManager.ts` (masking, storage fallback, validation).
- Integration test for `useLiveGexScanner` hook using mock Dhan responses.
- Component test for `ApiSettingsModal.tsx`.
- Regression test for `App.tsx` ensuring existing mock simulation mode remains 100% functional and test-verified.
