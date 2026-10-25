# Specification: GitHub Pages Deployment & Automated Git Data Sync

- **Date:** 2026-10-25
- **Author:** DhanHQ GEX Scanner Engineering Team
- **Status:** Approved

---

## 1. Executive Summary

This document specifies the architecture and implementation to deploy the Dhan GEX Scanner directly from GitHub via GitHub Pages, while maintaining automated market data snapshots committed directly to the Git repository.

In addition, it establishes a dual-mode live scanner:
1. **Client-side 30-second live polling** directly from the browser to DhanHQ API using browser-stored credentials (zero exposure in git).
2. **Automated headless Git sync** via GitHub Actions running on market close to compute and commit official GEX snapshots to `public/data/latest-gex.json` and timestamped archives.
3. **Graceful fallback** to Git snapshots when credentials are not yet entered or when the market is closed.

---

## 2. Goals & Non-Goals

### Goals
- Fully automated build and deployment to GitHub Pages via GitHub Actions upon push to `main`.
- Headless TypeScript script executed via GitHub Actions to fetch live DhanHQ option chain data, compute conventional GEX metrics, and commit the snapshot directly into Git.
- Configurable client-side live streaming polling interval (defaulting to 30s) directly in the browser.
- Git repository hygiene: Strict adherence to Rules 6 and 7 (never commit credentials, tokens, or `.env` files). Credentials in GitHub Actions are stored in GitHub Secrets.
- Zero breaking changes to existing test suites (124+ vitest tests).

### Non-Goals
- Automated order placement or execution (Strictly prohibited by Rule 12).
- Continuous 30-second GitHub Actions cron execution (prohibited by GitHub 5-minute cron limit and runner minute quotas; handled via client-side polling).
- Fabricating or synthesizing missing market data (Rule 11).

---

## 3. Architecture & Components

```
                                      +-------------------------------+
                                      |         GitHub Repo           |
                                      +-------------------------------+
                                           |                     ^
                     Push to main          |                     | Commits EOD
                           v               v                     | snapshot
               +-----------------------------+         +--------------------------+
               |  deploy-pages.yml Action    |         | market-snapshot.yml Action|
               |  (pnpm test -> pnpm build)  |         | (Dhan Secrets -> Script) |
               +-----------------------------+         +--------------------------+
                           |
                           v
               +-----------------------------+
               |     GitHub Pages Host       |
               |  https://.../dhan-gex-scanner|
               +-----------------------------+
                               |
                               v
                       Browser Client
           +-------------------------------------+
           | - Reads latest-gex.json snapshot   |
           | - Optional: User inputs Dhan keys   |
           |   in browser storage               |
           | - Live 30s streaming directly to    |
           |   api.dhan.co                       |
           +-------------------------------------+
```

### Component A: Vite Configuration & Asset Base
- Update `vite.config.ts`: Set `base: './'` or `/dhan-gex-scanner/` dynamically to support hosting under GitHub Pages subpaths.
- Ensure all relative asset links (scripts, styles, public icons) resolve properly on GitHub Pages.

### Component B: GitHub Pages Deployment Workflow (`.github/workflows/deploy-pages.yml`)
- Trigger: `push` to `main` branch, plus `workflow_dispatch` (manual).
- Environment: `ubuntu-latest`.
- Steps:
  1. `actions/checkout@v4`
  2. `pnpm/action-setup@v3`
  3. `actions/setup-node@v4` with node-version `20` and pnpm cache.
  4. Install dependencies: `pnpm install --frozen-lockfile`
  5. Test execution: `pnpm test` (ensures zero regression before deployment)
  6. Build: `pnpm build`
  7. Deploy: `actions/upload-pages-artifact@v3` with path `dist/` followed by `actions/deploy-pages@v4`.

### Component C: Headless Market Snapshot Script (`scripts/fetch-market-snapshot.ts`)
- Executable via Node (`tsx` or `ts-node`):
  ```bash
  pnpm snapshot:fetch
  ```
- Reads `DHAN_CLIENT_ID` and `DHAN_ACCESS_TOKEN` from environment variables.
- Connects to DhanHQ API using existing `DhanApiClient` and `DhanAdapter`.
- Fetches option chains for major Indian indices:
  - NIFTY 50 (Security ID: `13`, Segment: `IDX_I`)
  - BANK NIFTY (Security ID: `25`, Segment: `IDX_I`)
  - FINNIFTY (Security ID: `27`, Segment: `IDX_I`)
  - SENSEX (Security ID: `51`, Segment: `IDX_I`)
- Runs `calculateGexProfile` across active strikes.
- Computes:
  - Net GEX, Call GEX, Put GEX
  - Gamma Flip strike
  - Call Wall (major resistance) and Put Wall (major support)
  - Net Delta Exposure (DEX)
  - 0DTE Expiry Pin Probabilities
- Outputs to:
  - `public/data/latest-gex.json` (always the latest snapshot)
  - `public/data/archive/gex-YYYY-MM-DD.json` (historical record)

### Component D: Scheduled Market Snapshot GitHub Action (`.github/workflows/market-snapshot.yml`)
- Trigger:
  - Cron schedule: `35 10 * * 1-5` (15:35 IST / 10:05 UTC, Monday through Friday at market close)
  - Manual trigger: `workflow_dispatch` (allows manual snapshot anytime)
- Environment Variables passed to runner:
  - `DHAN_CLIENT_ID: ${{ secrets.DHAN_CLIENT_ID }}`
  - `DHAN_ACCESS_TOKEN: ${{ secrets.DHAN_ACCESS_TOKEN }}`
- Git Commit & Push:
  - If data changed, commits using `github-actions[bot]` identity:
    `git commit -m "[automated] chore: market close GEX snapshot YYYY-MM-DD [skip ci]"`
  - Pushes directly to `main`.

### Component E: Frontend Integration & 30-Second Polling
- In `src/hooks/useLiveGexScanner.ts`:
  - When user has configured API credentials, polling runs at 30-second interval (`VITE_REFRESH_INTERVAL_MS=30000` or user selected in settings).
  - When API credentials are absent or in offline/snapshot mode:
    - Automatically fetches `/data/latest-gex.json`.
    - Populates the dashboard with recorded snapshot levels and displays status badge:
      `[Git Snapshot: YYYY-MM-DD HH:MM IST]`.
- User can toggle between:
  1. Live 30s Dhan API
  2. Git Snapshot
  3. Simulated Sandbox

---

## 4. Security & Compliance (Rule 6, 7 & 12)

1. **No Credentials in Git:** Neither `DHAN_CLIENT_ID` nor `DHAN_ACCESS_TOKEN` will ever be stored in code or repository files.
2. **GitHub Secrets:** Credentials for the headless GitHub Action will be passed via encrypted repository secrets.
3. **Read-Only Broker Interaction:** The headless snapshot script and client-side scanner invoke only read-only quote and option-chain endpoints (`/marketfeed/quote`, `/optionchain`).
4. **No Trade Execution:** No order placement logic is included or supported.

---

## 5. Verification Plan

- **Automated Tests:**
  - Verify `vite.config.ts` build generates correct relative asset paths.
  - Test snapshot parser function in `src/test/snapshotLoader.test.ts`.
  - Validate GitHub workflow syntax.
  - Run full test suite (`pnpm test` => 124+ passing).
- **Manual Verification:**
  - Build output verification via `pnpm build && pnpm preview`.
  - Test mock snapshot loading in dashboard.
