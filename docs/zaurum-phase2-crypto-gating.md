# Zaurum Phase 2: Crypto Gating + Legacy Archive

Date: 2026-02-28

## Wallet mode contract

- `FCZ_WALLET_MODE=dual`: crypto endpoints/jobs/UI available.
- `FCZ_WALLET_MODE=zaurum_only`: crypto disabled server-side and hidden client-side.

## Endpoints gated in `zaurum_only`

- `POST /api/predictions/:predictionId/place-bet` (and `/api/v1/...`) -> `410`
- `ALL /api/escrow/*` -> `410`
- `ALL /api/chain/*` -> `410`
- `POST /api/wallet/reconcile` -> `410`
- `ALL /api/wallet/log-transaction` (transactionLog router) -> `410`
- `GET /api/v2/predictions/:id/quote?mode=real` -> `410`

## Jobs gated in `zaurum_only`

- Base deposit watcher startup (`startBaseDepositWatcher`) disabled.
- Escrow reconciliation job startup (`startReconciliationJob`) disabled.
- Lock expiration job remains enabled (cleanup safety).

## Legacy archive tables

Migration: `migrations/122_zaurum_only_crypto_archive_and_gates.sql`

- `legacy_crypto_accounts`
- `legacy_crypto_balances_snapshot`
- `legacy_crypto_events_snapshot`

All include `snapshot_version` and idempotent unique indexes.

## Admin snapshot command (idempotent)

Command:

```bash
npm --prefix server run archive:legacy-crypto -- --snapshot-version=<version> --admin-key=<ADMIN_API_KEY>
```

Behavior:

- snapshots `crypto_addresses` into `legacy_crypto_accounts`
- snapshots wallet USD rails into `legacy_crypto_balances_snapshot`
- snapshots crypto-related `wallet_transactions` + `blockchain_transactions` into `legacy_crypto_events_snapshot`
- safe to rerun for same `snapshot_version` (upsert-by-unique/no duplicates)

## Proof checklist (staging)

1. Set `FCZ_WALLET_MODE=zaurum_only`, deploy.
2. Call `POST /api/wallet/reconcile` -> expect `410`.
3. Call `/api/escrow/*` and `/api/chain/*` -> expect `410`.
4. Call `GET /api/v2/predictions/:id/quote?mode=real` -> expect `410`.
5. Confirm logs include:
   - `Zaurum-only mode: Base deposit watcher disabled`
   - `Zaurum-only mode: escrow reconciliation job disabled`
6. Run archive command and verify row counts in 3 archive tables for snapshot version.
