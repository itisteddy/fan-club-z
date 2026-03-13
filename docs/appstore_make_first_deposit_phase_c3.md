# App Store / Compliance Stream - Phase C3

Date: 2026-03-12  
Branch: `staging`

## Scope
- Fix only wallet empty-state CTA behavior for active `/wallet` route (`UnifiedWalletPage`).
- No backend changes.

## Root Cause
- Active empty-state CTA (`"Make Your First Deposit"`) in `UnifiedWalletPage` always called `handleDeposit`.
- `handleDeposit` opens crypto connect/deposit paths outside fiat mode.
- In Zaurum-only mode, this is wrong because the expected funding action is faucet claim (`Claim Zaurum`), not crypto deposit.

## Before
- Zaurum mode empty-state CTA:
  - Label: `Make Your First Deposit`
  - Action: connect-wallet / USDC deposit flow (via `handleDeposit`)

## After
- Zaurum mode or demo-mode empty-state CTA:
  - Label: `Claim Zaurum` (or cooldown label `Next claim in HH:MM:SS`)
  - Action: existing `faucetDemo()` path (same claim implementation used in wallet quick action)
  - Disabled during cooldown/loading, matching existing claim behavior
- Fiat mode:
  - unchanged behavior (deposit path via `handleDeposit`)
- Crypto mode:
  - unchanged behavior (connect-wallet / USDC deposit via `handleDeposit`)

## Files Changed
- `client/src/pages/UnifiedWalletPage.tsx`

## Validation
- Local build:
  - `npm --prefix client run build` -> PASS
- Staging manual validation checklist:
  1. Open `/wallet` in Zaurum-only mode with empty activity state.
  2. Verify CTA shows `Claim Zaurum` (or cooldown countdown).
  3. Click CTA and verify faucet claim behavior (success/cooldown/error toast behavior).
  4. Verify no connect-wallet modal and no USDC deposit modal opens from this CTA in Zaurum mode.
  5. If available, spot-check fiat/crypto modes remain unchanged.

## C3 Status
- Code fix complete.
- C3 can be marked CLOSED after staging visual/manual checklist is confirmed on live deployment.
