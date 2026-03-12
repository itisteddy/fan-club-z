# Zaurum Wallet Phase A4: Mode Lock + Minimal Wallet Context

## Scope Executed
- Hide crypto wallet mode controls in Zaurum mode (no disabled tab fallback).
- Keep wallet page layout structure intact.
- Surface contextual wallet values in wallet header row for Zaurum mode:
  - Available
  - Locked
  - Creator Earnings
- Keep stake flow compatibility from prediction detail/modal.
- Avoid broad wallet endpoint refactor.

## Code Changes (A4)
- `client/src/lib/cryptoFeatureFlags.ts`
  - Added `isZaurumModeEnabled()` and hard-gated crypto feature flags off when `VITE_ZAURUM_MODE=1|true`.
- `client/src/store/fundingModeStore.ts`
  - Added Zaurum-only guardrails preventing crypto mode selection/persistence.
- `client/src/pages/UnifiedWalletPage.tsx`
  - Hid wallet mode toggle strip in Zaurum mode.
  - In Zaurum mode, switched wallet summary cards to contextual values: Available, Locked, Creator Earnings.
- `server/src/routes/walletSummary.ts`
  - Added A4 read-compat fields used by wallet summary consumers:
    - `balances.demoCredits`
    - `balances.stakeBalance`
    - `balances.creatorEarnings`
    - `balances.creatorEarningsCumulative`
    - top-level aliases (`stakeBalance`, `creatorEarnings`, etc.)
    - milestone payload (`first10ZaurumEarned`, `first10Label`)

## Staging Validation Run (2026-03-12)
Validation runner: `/tmp/a4_validate.js`
Report artifact: `/tmp/a4_staging_validation.json`

Fixture IDs:
- `predictionId`: `5bc97fb9-1a5b-4c4b-9680-e542814567d8`
- `optionId`: `e3496564-a2f8-4419-b078-dccb8940b07b`

Backend SHA observed on staging during validation:
- `ec60328727923c813590b27f29f8162f6b9cbefd`

### Checklist Results
- wallet page API summary loads: PASS
- crypto tab/switching absent in Zaurum mode: PASS (code-path validated via mode gate)
- available/locked/creator earnings contextual read path: PARTIAL
  - available/reserved values present
  - creator transfer validation failed due summary response on deployed SHA missing creator/stake compatibility fields
- creator earnings move-to-balance still works: FAIL in current staging run (`creatorTransferWorks`)
- stake flow from prediction detail path (API flow) still works: PASS
- A3 top-up integrity remains intact: PASS
  - first stake PASS
  - second same-outcome stake PASS
  - post-submit quote current stake = 25 PASS
  - no duplicate active rows PASS
- discover/stakes/completed route APIs load: PASS
- leaderboard drift check: PASS (no leaderboard files modified)

### Failure Detail
Only failing check: `creatorTransferWorks`
- transfer endpoint returned `200`
- but `/api/wallet/summary/:userId` on deployed SHA did not expose creator/stake fields used for pre/post delta assertion, so post-transfer creator/stake deltas could not be verified from summary payload.

### Follow-up Patch for Staging Branch
Committed and pushed to `staging` branch:
- commit `9175e819`
- file: `server/src/routes/walletSummary.ts`
- purpose: add creator/stake compatibility fields to the active summary route contract.

At validation time, hosted staging backend still reported previous SHA (`ec603287`), so this fix was not yet observable in the API response.

## Pass/Fail
- **Overall A4 staging validation:** **FAIL (single blocker: creator transfer verification path on deployed staging SHA).**

## A5 Blockers
1. Staging backend must pick up commit `9175e819` (wallet summary compatibility fields).
2. Re-run the same A4 staging validation and confirm `creatorTransferWorks` passes using summary pre/post deltas.

## Guardrail Confirmation
- No avoid-for-now files were modified for A4 implementation.
