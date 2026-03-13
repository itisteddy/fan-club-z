# Pre-Live Zaurum Chunk 1 Validation (Staging)

Date: 2026-03-13
Status: Staging DB migration + reconciliation completed; live API parity requires backend deploy of this commit.

## Scope validated

- Bucket schema compatibility fields
- Idempotent legacy migration (`10:1`, cap `250`)
- Migration rerun protection
- Reconciliation queries (before/after/ledger)
- No regression in existing staging settlement parity harness

## Commands run

1. Apply schema migration:
- `APP_ENV=staging MIGRATION_DATABASE_URL="$DATABASE_URL" npm --prefix server run db:migrate-file -- migrations/343_zaurum_bucket_tracking.sql`

2. Full dry-run summary:
- `APP_ENV=staging MIGRATION_DATABASE_URL="$DATABASE_URL" npm --prefix server run db:zaurum-migration`

3. Controlled-user dry-run/apply/re-apply:
- `--user-ids=14acd61e-369a-4f6d-aeb2-49503ee0f993,04af1fed-2ee0-4f9b-a1e3-862999f4c1c7`

4. Before/after reconciliation:
- wallet balance/bucket fields from `wallets`
- migration ledger rows from `wallet_transactions`

5. Existing staging parity harness:
- `/tmp/staging_settlement_parity_check.sh`

## Key results

### Global dry-run summary (staging sample)
- users scanned: `110`
- pending migration: `110`
- uncapped converted total: `2028.611`
- capped total (cap 250): `1271.111`
- trimmed total: `757.5`

### Controlled-user reconciliation

Users:
- legacy-balance user: `14acd61e-369a-4f6d-aeb2-49503ee0f993`
- zero-legacy user: `04af1fed-2ee0-4f9b-a1e3-862999f4c1c7`

Dry-run (both):
- total legacy demo credits: `506.45`
- converted uncapped: `50.645`
- converted capped: `50.645`
- trimmed: `0`

Apply:
- credited `50.645` to legacy-balance user
- credited `0` to zero-legacy user
- migration markers set for both

Re-apply:
- appliedCount `0`
- alreadyMigratedCount `2`
- totalCredited `0`

### Wallet reconciliation (after apply)

Legacy-balance user:
- available: `557.095` (was `506.45`)
- demo_credits_balance: `557.095` (was `506.45`)
- legacy_migrated_zaurum_balance: `50.645`
- legacy_migration_version: `zaurum_migration_v1`

Zero-legacy user:
- available unchanged at `0`
- legacy_migrated_zaurum_balance: `0`
- legacy_migration_version: `zaurum_migration_v1`

### Migration ledger rows

Both users now have `wallet_transactions` row with:
- `provider='demo-wallet'`
- `external_ref='zaurum_legacy_migration:zaurum_migration_v1:<user_id>'`
- `source_bucket='legacy_migrated_zaurum'`
- `meta.kind='legacy_migration'`

### Existing flow sanity (staging harness)

- create prediction: `200`
- close prediction: `200`
- created/detail routes: `200`
- manual settlement: `200`
- manual/merkle settlement: `200`

## Live API caveat

- Live staging faucet endpoint currently returns `200` even after temporarily setting `claim_zaurum_balance=30`.
- This indicates live staging backend is still serving an older commit for route logic.
- Claim-cap-on-claim-bucket behavior for `/api/demo-wallet/faucet` must be re-checked after deploying this chunk’s backend commit.

Evidence snippet:
- Request: `POST https://fanclubz-backend-staging.onrender.com/api/demo-wallet/faucet`
- User: `04af1fed-2ee0-4f9b-a1e3-862999f4c1c7` (claim bucket temporarily set to 30, then restored)
- Response: `200`
- Header `x-request-id`: `ab2b8a22-b1b1-4f3a-83e9-7d1da675e499`

## Next required verification after backend deploy

1. `POST /api/demo-wallet/faucet` with `claim_zaurum_balance >= 30` returns structured cap block (`409 claim_cap_reached`).
2. `POST /api/demo-wallet/faucet` success path writes:
- `wallet_transactions.source_bucket='claim_zaurum'`
- `wallets.claim_zaurum_balance += 1`
3. Demo stake lock writes `source_bucket='mixed'` + `meta.source_bucket_debits`.
4. Settlement payout/creator-fee writes have `source_bucket` tags as implemented.
