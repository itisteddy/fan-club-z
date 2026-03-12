# Zaurum Surface Cleanup — Chunk A (Presentation Only)

Date: 2026-03-12
Branch: `staging`
Scope: active frontend surfaces only, presentation copy/icon cleanup, no backend/accounting changes.

## Root Cause Summary
Visible mixed semantics came from three frontend issues:
1. Multiple active surfaces still formatted in-app values with USD helpers (`$`, `USD`) instead of a Zaurum display path.
2. Zaurum mark component pointed to a non-canonical asset path, so icon context was inconsistent.
3. Event/value icon mappings still used `DollarSign` in in-app wallet/activity contexts.

## Source of Truth for Icon
- Canonical asset now used by `ZaurumMark`: `/brand/zaurum.png`
- Source file copied from icon pack: `fcz_icon_pack/Zaurum.png` -> `client/public/brand/zaurum.png`

## Files Changed
- `client/public/brand/zaurum.png` (new)
- `client/src/components/ui/ZaurumMark.tsx`
- `client/src/lib/txFormat.ts`
- `client/src/pages/UnifiedWalletPage.tsx`
- `client/src/pages/PredictionDetailsPageV2.tsx`
- `client/src/components/predictions/PlacePredictionModal.tsx`
- `client/src/components/predictions/PredictionCardV3.tsx`
- `client/src/pages/PredictionsPage.tsx`
- `client/src/pages/ProfilePageV2.tsx`
- `client/src/pages/UnifiedLeaderboardPage.tsx`
- `client/src/components/activity/ActivityFeed.tsx`
- `client/src/components/profile/ProfileAchievementsSection.tsx`
- `client/src/lib/predictionCardVM.ts`

## What Was Cleaned
- Removed in-app `$`/USD presentation leakage on touched active surfaces.
- Replaced in-app `DollarSign` usage with Zaurum mark or neutral non-dollar icons on touched event/value contexts.
- Removed `Stake Amount (USD)` style leakage in stake-entry surfaces.
- Updated discover/predictions/profile/leaderboard touched displays to Zaurum semantics.
- Kept backend/API/accounting logic unchanged.

## Local Validation
- Build: `npm --prefix client run build` -> PASS
- Targeted string scan on touched files:
  - `Demo Credits` / `Demo Tokens` / `Stake Amount (USD)` -> no matches
  - `DollarSign` in touched active in-app files -> no matches

## Staging Validation
Pending deploy + manual visual run on staging:
- `/wallet`
- `/prediction/:id`
- stake modal
- `/discover`
- `/predictions`
- `/profile`
- `/leaderboard`

Regression checklist to re-run after deploy:
- `walletSummaryLoads`
- `walletSummaryHasContextValues`
- `creatorTransferWorks`
- `stakeFlowBet1`
- `stakeFlowBet2`
- `stakeFlowQuoteCurrentAfterSubmit`
- `stakeFlowNoDuplicateRows`
- `discoverRouteApiLoads`
- `stakesRouteApiLoads`
- `completedRouteApiLoads`

## Deferred to Chunk B (Balance/Journey Alignment)
- Any cross-surface balance-source mismatches (wallet summary vs stake-entry read model)
- Any stale post-mutation read timing inconsistencies
- Backend/accounting verification (out of scope for Chunk A)
