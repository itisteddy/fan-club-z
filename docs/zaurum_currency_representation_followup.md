# Zaurum Representation Follow-up (Chunk C Completion Patch)

## Scope
- Profile acknowledgment/progress formatting fix.
- `/predictions?tab=Created` runtime crash fix.
- No backend/auth/layout/admin changes.

## Root Cause — Created Tab Crash
- `PredictionsPage` used `prediction.category.replace('_', ' ')` in Created/Completed card rendering.
- Some created predictions have `category = null`.
- Calling `.replace(...)` on `null` caused:
  - `TypeError: Cannot read properties of null (reading 'replace')`.

## Fix Applied
- Added `safeCategoryLabel(category)` in `PredictionsPage`.
- Replaced direct `.replace(...)` category calls with safe fallback to `'custom'`.

## Profile Progress Fix
- `ProfileAchievementsSection` previously rendered backend `progressLabel` strings directly.
- For in-app amount metrics, backend labels can be dollar-formatted (`$0.00/$10.00`).
- Added metric-aware rendering:
  - For `creator_earnings_amount`, `payouts_amount`, `net_profit` progress metrics:
    - render as icon + amount / icon + goal amount.
  - Non-amount metrics keep their original text progress label.

## Build Validation
- `npm --prefix client run build` passed.

## Active Route Notes
- `/wallet` active route is `UnifiedWalletPage` (not `WalletPageV2`).
- `/predictions` is active and was fixed.
- `UnifiedMyBetsPage` is present but not part of main active tab route in current app shell.

