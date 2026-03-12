# Zaurum Wallet Phase A5.4 - Remaining Wording Cleanup (Copy/Text Only)

Date: 2026-03-12

## Scope
Copy/text-only cleanup on approved files. No backend, routing, layout, icon, or business-logic changes.

## Changed Files
- client/src/pages/WalletPageV2.tsx
- client/src/components/predictions/BetOptions.tsx
- client/src/components/prediction/PredictionActionPanel.tsx
- client/src/store/predictionStore.ts
- client/src/lib/storeSafePolicy.ts
- client/src/landing/SupportPage.tsx
- client/src/landing/PrivacyPolicyPage.tsx

## Text Changes Applied
- Replaced remaining in-app wording references from demo/USD phrasing to Zaurum phrasing in the scoped surfaces.
- Examples:
  - `Demo Credits` -> `Zaurum`
  - `Stake Amount (USD)` -> `Stake Amount (Zaurum)`
  - `Insufficient demo credits.` -> `Insufficient Zaurum balance.`
  - `demo mode` copy in store-safe policy messages -> `Zaurum mode`

## Validation Results

### 1) Client Build
- Command: `npm --prefix client run build`
- Result: PASS

### 2) Regression Flow (same flow used in A5.3)
- Command: `set -a; source client/.env.staging; set +a; node /tmp/a4_validate.js`
- Result: PASS
- Output summary: `{ "pass": true, "failures": [] }`

### 3) Manual Staging Spot-check (touched surfaces)
- Status: Pending manual UI pass in staging.
- Surfaces to verify:
  - WalletPageV2 (if reachable)
  - Bet options / prediction action panel wording
  - Support page
  - Privacy policy page

### 4) Leaderboard Visual Parity
- Files unchanged in this phase.
- Visual parity check required in staging UI as a final manual confirmation.

## Remaining Old Wording Surfaces (Post-A5.4)
- No remaining `Demo Credits` / `Demo Tokens` / `Stake Amount (USD)` strings in the scoped files.
- `USDC` wording remains in `WalletPageV2` for on-chain wallet sections and is intentional external/on-chain terminology.

## Recommended Next Stream
- App Store / compliance stream.
