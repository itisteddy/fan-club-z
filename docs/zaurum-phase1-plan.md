# Zaurum Phase 1 Plan (Execution Order)

Date: 2026-02-28

## Guardrails

- Keep `FCZ_WALLET_MODE=dual` and `VITE_FCZ_WALLET_MODE=dual` as production default until cutover.
- Every phase must be reversible with flag rollback to `dual`.
- No schema-destructive migrations before cutover validation.

## Phase order

## Phase 0 (this pass): Foundation, inventory, diagnostics

- Add wallet mode flags with default `dual`.
- Add dev-only money mutation logger.
- Produce inventory and mutation audit docs.
- Outcome: no user-visible behavior changes.

## Phase 1: Read-path gating (UI + API responses)

1. Frontend gate by mode:
   - hide crypto connect/deposit/withdraw controls when `zaurum_only`
   - keep wallet and staking screens functional with non-crypto balances
2. Backend read-path gate:
   - wallet summary/activity responses avoid crypto-specific fields/labels when `zaurum_only`
   - keep endpoint contracts backward-compatible where needed
3. Add tests for mode-specific rendering and response shape.

Exit criteria:
- `zaurum_only` shows no wallet-connect/web3 UX.
- Staking and wallet reads still work.

## Phase 2: Write-path gating (disable crypto mutations)

1. Disable/short-circuit crypto and chain mutation routes in `zaurum_only`:
   - wallet connect-dependent actions
   - on-chain deposit watcher credit paths
   - chain-specific finalize routes that require creator wallet posting
2. Keep demo/zaurum staking, settlement, creator earnings transfers active.
3. Add explicit API errors for disabled flows with stable error codes.

Exit criteria:
- No crypto deposit/withdraw/on-chain settlement writes in `zaurum_only`.
- Non-crypto wallet/stake flows unaffected.

## Phase 3: Data model normalization for single in-app rail

1. Consolidate balance semantics used by staking and wallet UI:
   - ensure available/stake/creator-earnings stay internally consistent
2. Backfill/cleanup migration(s) for historical edge cases.
3. Lock down mutation points to a small set of services.

Exit criteria:
- Wallet balances reconcile deterministically from transaction history.
- Creator transfer and staking use consistent account fields.

## Phase 4: Cutover + cleanup

1. Set production to `zaurum_only`.
2. Run smoke matrix (web, iOS, Android) for wallet/stake/settlement.
3. Remove dead crypto UI and server code paths after stable window.
4. Keep rollback path for one release cycle.

Exit criteria:
- Production runs without crypto in-app flows.
- No regressions in staking, settlement, creator earnings, achievements.

## Test/validation checklist per phase

1. Place stake (first and top-up) still updates balances and position.
2. Settle market updates payouts/fees/creator earnings.
3. Move creator earnings updates stake-available balances correctly.
4. Wallet activity reflects all mutations.
5. No mode regression when toggling `dual` <-> `zaurum_only` in staging.

## Rollback

- Immediate rollback: set both flags back to `dual` and redeploy.
- Data rollback: migration scripts are additive; no destructive rollback required for Phases 0-2.
