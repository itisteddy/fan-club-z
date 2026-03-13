# Pre-Live Zaurum Economy Spec

Date: 2026-03-13
Status: Draft for review (no prod promotion)

## 1) Bucket Model (source-of-funds)

Required buckets:
- `claim_zaurum`
  - Source: daily claim/faucet grants.
- `won_zaurum`
  - Source: prediction settlement payouts/profits.
- `creator_fee_zaurum`
  - Source: creator fee credits from settled markets.
- `legacy_migrated_zaurum`
  - Source: one-time conversion from legacy demo balances.

Recommended storage model:
- Keep user-facing wallet simple (`Available`, `Locked`, `Creator Earnings`) for now.
- Add internal source-bucket accounting in ledger/balance accounts so withdrawal policy can be enforced later.

## 2) Claim Ceiling Rule

Rule:
- Claim ceiling applies to **claim-derived bucket only**, not total balance.

Definition:
- `claim_zaurum_cap = 30`
- Allow claim when `claim_zaurum_current < 30`.
- Deny claim (cooldown/cap response) when `claim_zaurum_current >= 30`.

Important:
- User may still hold total balance > 30 from winnings/creator fees/migration.

## 3) Withdrawal Policy Direction (per bucket)

Current policy direction:
- `claim_zaurum`: **non-withdrawable** (participation subsidy)
- `won_zaurum`: **potentially withdrawable later**
- `creator_fee_zaurum`: **potentially withdrawable later**
- `legacy_migrated_zaurum`: **do not assume withdrawable now**

Recommendation for legacy-migrated treatment now:
- Keep as **separate non-withdrawable bucket pending explicit policy**.

## 4) Legacy Migration Policy Direction

- One-time deterministic migration from legacy demo balance to Zaurum.
- Proposed conversion: `10 demo credits = 1 Zaurum`.
- Recommended migration cap: `250` migrated Zaurum.
- Migration must be idempotent, auditable, and replay-safe.

## 5) Recommendation on Legacy-Migrated Withdrawability

Recommended option: **C (separate bucket pending later policy)**

Why:
- Preserves legacy user value without silently wiping balances.
- Avoids accidental immediate cash-out eligibility before withdrawal policy is finalized.
- Enables future policy flip with a controlled migration/flag.

## 6) User State Examples

1. Claim-only user
- claim: 12, won: 0, creator_fee: 0, migrated: 0
- total: 12
- can claim until claim bucket reaches 30.

2. Claim + winnings user
- claim: 30, won: 45, creator_fee: 0, migrated: 0
- total: 75
- claim blocked by claim cap, winnings still usable for staking.

3. Creator-fee user
- claim: 5, won: 0, creator_fee: 60, migrated: 0
- total: 65
- creator fee remains tracked separately for future withdrawal policy.

4. Migrated legacy user
- claim: 0, won: 0, creator_fee: 0, migrated: 400
- total: 400
- migrated bucket retained; withdrawability deferred by policy.

## 7) UI Implications

User-facing now:
- Keep existing simple wallet cards and stake UX.
- Use Zaurum terminology only (no demo wording).
- Claim UX should communicate claim cap as claim-bucket cap, not total-balance cap.

Internal-only now:
- Source bucket split and withdrawal eligibility flags.
- Migration classification (`legacy_migrated_zaurum`).

## 8) Audit / Logging Requirements

Every money movement should persist:
- `user_id`
- `amount`
- `currency`
- `source_bucket` (claim/won/creator_fee/legacy_migrated)
- `direction` (credit/debit)
- `reference_type` + `reference_id`
- idempotency key (`external_ref`/request id)
- timestamp + status

Migration run audit must include:
- migration batch id
- pre-balance
- converted uncapped amount
- applied cap
- final migrated amount
- whether capped
