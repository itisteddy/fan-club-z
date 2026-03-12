# Zaurum Wallet Parity Cleanup Phase

## Root Cause Summary

1. Frontend mode gating was split across two env sources, and `fundingModeStore` still keyed off `VITE_ZAURUM_MODE` only.
2. Stake-entry surfaces (`PredictionDetailsPageV2`, `PlacePredictionModal`) used demo-wallet summary for visible Zaurum availability while wallet summary cards used `/api/wallet/summary` (`stakeBalance`), causing visible balance drift.
3. Zaurum-mode wording/units could still fall back to USD labels in mixed mode state before mode normalization.
4. Unified wallet displayed creator earnings in both the top stat row and a second dedicated card, causing redundant presentation.

## Chosen Available-Balance Source (Zaurum Mode)

- **Chosen source for visible stake availability in Zaurum mode:** `walletSummary.stakeBalance` from `/api/wallet/summary/:userId` (via `useWalletSummary`).
- **Fallback chain:** `walletSummary.stakeBalance` -> `walletSummary.balances.stakeBalance` -> demo summary available.
- **Why:** This matches the balance model already shown in `UnifiedWalletPage` top cards and reduces wallet-vs-stake display mismatch without backend API refactors.

## Files Changed

- `client/src/store/fundingModeStore.ts`
- `client/src/pages/PredictionDetailsPageV2.tsx`
- `client/src/components/predictions/PlacePredictionModal.tsx`
- `client/src/pages/UnifiedWalletPage.tsx`

## What Changed

1. Mode-source unification:
   - `fundingModeStore` now uses `VITE_FCZ_WALLET_MODE=zaurum_only` as primary.
   - `VITE_ZAURUM_MODE` remains backward-compat fallback.
   - In Zaurum-only mode, non-demo mode selections are forced back to demo.

2. Stake wording/units in Zaurum mode:
   - Stake labels/announcements now stay Zaurum-consistent in Zaurum mode.
   - Removed Zaurum-mode fallback messaging that displayed USD-style insufficiency copy.

3. Visible balance source alignment:
   - `PredictionDetailsPageV2` and `PlacePredictionModal` now derive Zaurum available balance from `useWalletSummary` (`stakeBalance`).
   - Post-faucet and post-stake flows refetch wallet summary to keep visible values synchronized.

4. Redundant creator-earnings presentation:
   - Removed the duplicate titled creator earnings card block in `UnifiedWalletPage`.
   - Kept one compact action strip (`Move to Balance`, `View history`) without duplicating the balance block itself.

5. Icon context correction (touched surfaces only):
   - Replaced Zaurum "Available" stat icon in `UnifiedWalletPage` top row from dollar icon to `ZaurumMark`.

## Validation Results

### Local

- `npm --prefix client run build`: **PASS**

### Staging Regression Checklist

- `walletSummaryLoads`: **PENDING (requires staging deploy + authenticated run)**
- `walletSummaryHasContextValues`: **PENDING**
- `creatorTransferWorks`: **PENDING**
- `stakeFlowBet1`: **PENDING**
- `stakeFlowBet2`: **PENDING**
- `stakeFlowQuoteCurrentAfterSubmit`: **PENDING**
- `stakeFlowNoDuplicateRows`: **PENDING**
- `discoverRouteApiLoads`: **PENDING**
- `stakesRouteApiLoads`: **PENDING**
- `completedRouteApiLoads`: **PENDING**

### Manual Staging Visual Checklist

- `/wallet` parity checks: **PENDING**
- Prediction detail parity checks: **PENDING**
- Place stake modal parity checks: **PENDING**
- `/leaderboard` visual parity checks: **PENDING**

## Deferred Items (Out of Scope for This Chunk)

1. Full endpoint family unification (`/api/demo-wallet/*` vs `/api/wallet/*`) beyond display-source alignment.
2. App-wide icon rollout and non-touched surface cleanup.
3. Remaining old wording on non-touched/legacy-or-secondary surfaces.
