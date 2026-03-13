# Single Zaurum Wallet - Next Chunk (Active UI Mode Controls Removal)

Date: 2026-03-12  
Branch: `staging`

## Scope
- Remove user-facing mode segmented controls from active wallet/stake surfaces.
- Keep backend contracts and `predictionStore` funding payload behavior unchanged.

## Active Controls Removed

1. `UnifiedWalletPage`
- Removed visible segmented control buttons:
  - `Crypto (USDC)`
  - `Zaurum`
  - `Fiat (NGN)`

2. `PredictionDetailsPageV2`
- Removed visible stake panel segmented control buttons:
  - `Crypto (USDC)`
  - `Zaurum`
  - `Fiat (NGN)`

3. `PlacePredictionModal`
- Removed visible modal segmented control buttons:
  - `Crypto (USDC)`
  - `Zaurum`
  - `Fiat (NGN)`

## Internal Logic Intentionally Left In Place

- `fundingModeStore` state and persistence (`fcz:fundingMode`)
- `walletModeSettings` / server `users.wallet_mode` sync bootstrapping
- Existing `predictionStore` request payload usage of `fundingMode`
- Runtime/store-safe/capability gating (`runtime`, `storeSafePolicy`, `cryptoFeatureFlags`)

These remain for compatibility and will be cleaned in later phases.

## Deferred Cleanup

1. Remove/deprecate server/client persisted wallet mode (`users.wallet_mode`, `fcz:fundingMode`) once parity is proven.
2. Normalize internal naming from mode-centric to capability/onramp-centric semantics.
3. Remove stale non-active wallet mode surfaces (legacy/dead branches) in a dedicated cleanup phase.

## Validation Notes

- Local build required:
  - `npm --prefix client run build`
- Staging manual validation required:
  - `/wallet` has no segmented mode control
  - prediction detail has no segmented mode control
  - stake modal has no segmented mode control
  - stake/claim/creator transfer still function

## Execution Results

- Local build:
  - `npm --prefix client run build` -> PASS
- Static check on touched files:
  - No remaining `Crypto (USDC)` / `Fiat (NGN)` segmented mode buttons in:
    - `UnifiedWalletPage.tsx`
    - `PredictionDetailsPageV2.tsx`
    - `PlacePredictionModal.tsx`
- Live staging manual validation:
  - Pending after deploy (must be completed as final gate).
