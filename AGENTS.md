# AGENTS.md

## Project Overview

**Project Name:** Dhan API GEX Scanner  
**Objective:** Provide real-time and periodic Gamma Exposure (GEX) analytics and scanner capabilities for Indian equity indices and derivatives using the DhanHQ API.

---

## Non-Negotiable Core Rules

All AI agents, pair programmers, and automated tooling working in this repository must strictly adhere to the following rules:

1. **Inspect Git Status & Commits:** Always inspect `git status` and recent commit logs before creating, modifying, or deleting any files.
2. **Preserve User Changes:** Never overwrite, clobber, or discard existing user changes or uncommitted work without explicit user approval.
3. **Small, Logical Development Stages:** Work in incremental, logical stages rather than large, monolithic code dumps.
4. **Test Before Proposing Commits:** Run appropriate test suites and verifications before proposing any commit.
5. **Review Git Diff:** Inspect and review `git diff` before finalizing or committing changes to ensure only intended changes are staged.
6. **Strict Secrets & Credential Protection:** Never commit API tokens, passwords, `.env` files, private keys, access credentials, or sensitive data under any circumstance.
7. **Environment File Hygiene:** Maintain `.env.example` with clear documentation and placeholder values only. Keep `.env` strictly gitignored.
8. **Never Force-Push or Rewrite History:** Never run `git push --force`, `git rebase` on shared branches, or any command that rewrites git history.
9. **Verified Assertions Only:** Do not claim that tests, builds, commits, or pushes succeeded unless explicitly executed and verified via tool output.
10. **Structured Stage Reporting:** After completing each stage, explicitly report:
    - **Changed Files:** List of all files created, modified, or deleted.
    - **Test Results:** Summary of test suites or validation checks executed.
    - **Known Limitations:** Any edge cases, missing data constraints, or deferred items.
    - **Recommended Commit Message:** A clear, conventional commit message proposal.
11. **GEX Prioritization & Data Integrity:**
    - Build **conventional GEX** first.
    - Treat **PC-GEX (Put-Call / Positional-Cash Gamma Exposure)** as experimental.
    - **Never fabricate or synthesize missing footprint or volume/OI data.**
12. **No Automated Order Placement:** Do not implement automated order execution or trade placement logic. The application is strictly an analytical scanner and decision-support tool.

---

## Domain & Methodology Guidelines

### 1. Conventional GEX First
- Prioritize calculating standard Black-Scholes gamma exposure aggregated across strike prices, expirations, and contract types (Calls vs. Puts).
- Track primary metrics:
  - Net GEX per strike and aggregated.
  - Gamma Flip level (zero gamma transition).
  - Call Wall (major resistance / dealer short gamma pin) and Put Wall (major support).
  - Net Delta / Delta-adjusted Gamma where applicable.
- Experimental features (e.g., PC-GEX, intraday order-flow footprint estimates) must be clearly segregated, flagged as experimental, and never rely on fabricated or assumed data when broker API data is unavailable.

### 2. DhanHQ API Integration
- Adhere to DhanHQ API v2 rate limits, authentication flows, and data models.
- Gracefully handle market holidays, pre-market/post-market states, missing strikes, and API throttling.
- Isolate API client wrappers and network IO from core mathematical/GEX calculation engines.

### 3. Safety & Boundaries
- All broker API integrations must remain read-only (fetching market quotes, option chains, security master, historical data).
- Under no circumstances should order placement or capital execution endpoints (`/orders`, trade execution) be activated or scheduled.

---

## Development & Verification Workflow

1. **Before Starting Any Task:**
   - Run `git status` to verify working tree status.
   - Clarify scope and break requirements into manageable chunks.
2. **During Implementation:**
   - Make surgical, minimal edits.
   - Keep code modular, typed, and well-documented.
3. **Before Completion:**
   - Run linter and automated tests.
   - Run `git diff` to inspect changes.
   - Provide stage report following Rule 10.
