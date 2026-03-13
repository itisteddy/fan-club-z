# Wallet / Zaurum Trust Repair — Chunk C

## Root Cause Summary
- In-app currency rendering was fragmented across multiple local formatters and inline string templates.
- Several active surfaces still used legacy `$` prefixes or text markers like `Z`/`Zaurum` for amounts.
- Active modal and activity surfaces had independent amount render paths that bypassed the Zaurum icon convention.

## Representation System Applied
- In-app amount display now uses a shared renderer:
  - `client/src/components/ui/ZaurumAmount.tsx`
  - Output shape: `[Zaurum icon] [numeric amount]` (optional sign).
- Descriptive labels continue to use the word `Zaurum` where appropriate (for example `Stake Amount (Zaurum)`).
- External currency references (for example `USD` estimates and `USDC` crypto rail paths) were left intact.

## Files Changed
- `client/src/components/ui/ZaurumAmount.tsx` (new)
- `client/src/lib/txFormat.ts`
- `client/src/pages/UnifiedWalletPage.tsx`
- `client/src/pages/UnifiedLeaderboardPage.tsx`
- `client/src/components/activity/ActivityFeed.tsx`
- `client/src/components/modals/ManagePredictionModal.tsx` (active manage modal)
- `client/src/components/predictions/BetOptions.tsx` (active stake input surface)
- `client/src/components/prediction/PredictionActionPanel.tsx` (active stake panel surface)
- `client/src/pages/PredictionDetailsPageV2.tsx`
- `client/src/components/predictions/PlacePredictionModal.tsx`
- `client/src/components/predictions/StickyBetBar.tsx` (required to allow icon+amount label node)
- `client/src/components/profile/ProfileAchievementsSection.tsx`

## Local Validation
- Build: `npm --prefix client run build` passed.

## Static Scan (Touched Active Surfaces)
- No remaining direct `$` amount markers in touched in-app surfaces.
- No remaining `Stake Amount (USD)` in touched in-app surfaces.
- No remaining plain `Z` amount markers in touched in-app surfaces.
- Intentional external references kept:
  - `USD` estimate copy in wallet FX section.
  - `USDC` labels in crypto-mode-specific paths.

## Staging Validation Checklist (to run after deploy)
1. `/wallet`:
   - in-app amounts render with icon + number.
   - no `$` for in-app values.
2. `/prediction/:id` + stake modal:
   - no `Stake Amount (USD)` in Zaurum flow.
   - sticky CTA and stake values render icon + number.
3. `/predictions` manage modal:
   - pool/earnings/activity/participant in-app amounts render icon + number.
4. `/profile`:
   - achievements text reads `Zaurum` in descriptive copy.
5. `/leaderboard`:
   - winner/profit values render icon + amount (no `... Z`).
   - compact row height and numeric alignment unchanged.
