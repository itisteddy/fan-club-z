# Creator Earnings Separation Rollout Checklist

## Staging validation

- Create/seed a user with demo credits and confirm demo wallet summary shows `demo_credits_balance`.
- Place a demo-mode stake and verify only demo credits are consumed (no change to `creator_earnings_balance` or `stake_balance`).
- Trigger a settlement with creator fee and verify the creator fee credits `creator_earnings_balance` (not demo credits, not stake balance).
- Open Wallet screen and verify three balances render: Demo Credits, Wallet / Stake Balance, Creator Earnings.
- Use `Move to Balance` to transfer part of creator earnings and verify:
  - `creator_earnings_balance` decreases
  - `stake_balance` increases
  - legacy `wallets.available_balance` (USD row) is mirrored for backward compatibility
- Verify creator earnings history shows both credit and transfer rows.
- Inspect `wallet_transactions` rows and confirm new audit columns are populated:
  - `from_account`
  - `to_account`
  - `reference_type`
  - `reference_id`
- Verify duplicate settlement retries do not double-credit creator earnings (idempotent `provider + external_ref`).
- Verify auth on `/api/wallet/transfer-creator-earnings` and `/api/wallet/creator-earnings/history` rejects unauthenticated requests and only uses the bearer-token user id.
- Verify RLS blocks direct cross-user reads for `wallets` and `wallet_transactions` (non-service role).

## Production rollout

- Run `migrations/113_separate_creator_earnings_balances.sql`.
- Deploy backend before mobile/web clients (API remains backward-compatible and preserves legacy wallet fields).
- Monitor settlement logs for creator fee credit failures (`[SETTLEMENT] Failed to credit ... creator earnings`).
- Monitor transfer endpoint error rates for `INSUFFICIENT_CREATOR_EARNINGS` and `DB_TX_UNAVAILABLE`.
- Keep legacy `available_balance`/`reserved_balance` reads in place until all clients are updated.
- If feature flags are available, gate the Creator Earnings transfer UI first, then enable for all users after reconciliation checks.

