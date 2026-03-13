# Pre-Live Zaurum Implementation Plan (Safe, Phased)

Date: 2026-03-13
Status: Chunk 1 implemented on staging branch (staging validation + reconciliation required before prod)

## Target outcomes

- One-time legacy migration is deterministic, idempotent, and auditable.
- Claim cap enforced on claim bucket only.
- Won and creator-fee value tracked separately for future withdrawability.
- User-facing wallet remains simple while internal buckets are robust.

## Chunk 1 Delivered

Implemented in this chunk:
1. Schema compatibility fields:
- `wallet_transactions.source_bucket`
- wallet bucket fields + legacy migration marker fields on `wallets`
2. Tagging of new writes:
- claim faucet -> `claim_zaurum`
- settlement payout -> `won_zaurum`
- creator fee credits -> `creator_fee_zaurum`
- migration credits -> `legacy_migrated_zaurum`
3. Idempotent migration script:
- `server/scripts/zaurum-legacy-migration.ts`
4. Claim-cap logic update:
- claim blocked only when `claim_zaurum_balance >= 30`

Validation evidence:
- [prelive_zaurum_chunk1_validation.md](/Users/efe/Dev/fanclubz/docs/prelive_zaurum_chunk1_validation.md)

## Phase 0 - Preconditions

1. Freeze final policy inputs:
- conversion: `10:1`
- migration cap: `250`
- legacy migrated bucket withdrawability: non-withdrawable for now

2. Archive production read-only distribution output from SQL pack for audit evidence.

## Phase 1 - Ledger Schema Compatibility (minimal)

Goal:
- Add normalized source classification without breaking existing reads.

Minimal changes:
1. Add source-bucket metadata support on transaction writes
- Either explicit `source_bucket` column in `wallet_transactions`, or
- strict `meta.source_bucket` standard if column migration must be deferred.

2. Backward compatibility:
- Existing `type/channel/provider/meta.kind` remain valid.
- No endpoint rename in this phase.

Validation:
- New writes include bucket tags for claim/payout/creator-fee/migration.
- Existing activity endpoints continue to work.

## Phase 2 - One-Time Legacy Migration

Goal:
- Convert legacy demo balances into `legacy_migrated_zaurum` deterministically.

Rules:
1. Input balance per user:
- `legacy_demo_credits = GREATEST(0, COALESCE(wallets.demo_credits_balance, wallets.available_balance, 0))` where `currency='DEMO_USD'`.

2. Convert:
- `converted_uncapped = legacy_demo_credits / 10`

3. Cap:
- `converted_capped = LEAST(converted_uncapped, migration_cap)`

4. Credit destination:
- add to internal `legacy_migrated_zaurum` bucket
- maintain user-visible available/stake compatibility per current wallet model

5. Idempotency:
- one migration transaction per user with stable `external_ref`:
  - `zaurum_migration:<user_id>:v1`
- reruns must no-op if transaction exists.

6. Audit:
- log pre-balance, uncapped, capped, trimmed, final amount.

Validation:
- Repeat run creates no duplicate credits.
- Sum of migrated credits equals expected capped totals.

## Phase 3 - Claim Bucket Logic + Ceiling

Goal:
- Enforce claim cap on claim-derived balance only.

Rules:
1. Daily claim amount: `1 Zaurum`
2. Ceiling check: deny only when `claim_balance >= 30`
3. Cooldown still enforced separately (24h)

Behavior:
- total wallet can exceed 30 from won/creator-fee/migrated buckets.

Validation:
- user with claim=30, won>0 cannot claim but can still stake existing balance.
- user with claim<30 can claim regardless of total balance.

## Phase 4 - Won / Creator Fee Bucket Tracking

Goal:
- Ensure settlement and creator flows write bucket-classified credits.

Writes to classify:
- settlement winner payout -> `won_zaurum`
- creator fee credit -> `creator_fee_zaurum`
- claim faucet -> `claim_zaurum`
- migration credit -> `legacy_migrated_zaurum`

Validation:
- bucket sums reconcile to wallet totals under compatibility model.

## Phase 5 - Wallet Read Compatibility Layer

Goal:
- Keep UI simple now, preserve internal bucket precision.

User-facing now:
- Available
- Locked
- Creator Earnings

Internal (for policy/withdraw later):
- claim bucket balance
- won bucket balance
- creator-fee bucket balance
- legacy-migrated bucket balance

## Phase 6 - Release Validation Gate

Required before prod promotion:
1. Claim works with structured responses and no legacy demo wording.
2. Claim cap logic proven against claim bucket only.
3. Stake + top-up + settlement + creator transfer still pass.
4. Activity labels remain Zaurum-consistent on active surfaces.
5. Migration dry-run reconciliation report matches expected totals.

## Deferred (explicitly not in this chunk)

- Dispute frontend implementation.
- Full endpoint family renames.
- Broad wallet architecture refactor.
- Final withdraw UX.
