# Pre-Live Zaurum Chunk 2 — User-Facing Read-Model Alignment

Date: 2026-03-13
Status: Staging-validated

## Focus questions (answered before implementation)

1. What should the user-facing wallet show now that internal buckets exist?
- Keep a simple model: `Available`, `Locked`, `Creator Earnings`.
- Keep bucket accounting internal/reconciliation-first.

2. Which visible balances should be surfaced directly?
- `available`: canonical spendable Zaurum.
- `reserved`/`locked`: active stake locks.
- `creatorEarnings`: creator earnings awaiting transfer.

3. Which internal buckets should remain internal only?
- `claim_zaurum`, `won_zaurum`, `creator_fee_zaurum`, `legacy_migrated_zaurum` remain internal bookkeeping/reconciliation fields.
- They can stay in API payload for diagnostics, but UI should not require users to reason about them.

4. How should migrated legacy Zaurum be reflected in visible wallet?
- Included in visible `available` rollup automatically.
- Not shown as a separate top-level UI balance in this chunk.

5. Is any active UI still reading compatibility shadow values in a way that should now be cleaned up?
- Yes, read shaping still had `demo_credits_balance`-first fallback in key paths.
- Chunk 2 changes shift canonical reads to `available/reserved` and keep `demoCredits` as a compatibility alias.

## Chunk 2 implementation summary

- Server balance summary shaping now prefers canonical demo wallet `available_balance/reserved_balance` for user-visible values.
- Compatibility alias `demoCredits` is retained but no longer treated as authoritative.
- Wallet page in Zaurum mode now treats `walletSummary.available/reserved` as the visible source of truth.
- Legacy `/api/demo-wallet/summary` path remains untouched in this chunk to avoid broad scope; active Zaurum wallet route uses `/api/wallet/summary`.

## Validation checklist

- Local builds:
  - `npm --prefix server run build`
  - `npm --prefix client run build`
- Staging flow:
  - migrated user / zero-legacy user / claimant / winner checks (available, locked, creator earnings)
  - post-claim, post-stake, post-settlement, creator transfer visibility consistency
- Compatibility risk check:
  - whether active UI still meaningfully depends on `demo_credits_balance`

## Results

### Build
- `npm --prefix server run build`: pass
- `npm --prefix client run build`: pass

### Live staging deploy parity
- Backend `/health` gitSha: `3ac0efcc79e73c9b5ec8a3f98ceaf3cbdedda02e`
- Confirms chunk-2 backend read-model changes are live before validation.

### Controlled live validation evidence
Raw artifact:
- `/tmp/prelive_chunk2_live_validation.json`

Validated cohorts:
1. migrated user
2. zero-legacy claimant
3. at-cap claimant
4. stake/top-up participants
5. creator transfer path

Key outcomes:
- Migration user:
  - before: available `0`
  - after migration: available `100`, `legacyMigratedZaurum=100`
  - dry-run/apply/reapply outputs confirmed deterministic + idempotent behavior.
- Below-cap claim user:
  - faucet `200`, +`1` credit, `claimZaurum` incremented, visible wallet coherent.
- At-cap claim user:
  - faucet `409` with `claim_cap_reached`, no visible credit drift.
- Stake/top-up path:
  - participant A after claim/stake: `available 1 -> 0.5`, `reserved 0 -> 0.5`
  - participant B after claim/stake: `available 1 -> 0.4`, `reserved 0 -> 0.6`
  - visible summary remained coherent before/after settle call.
- Creator transfer:
  - transfer endpoint returned `200` (`applied: true`)
  - creator earnings visible value decremented `2 -> 1` after transfer response path.

### Compatibility risk check (`demo_credits_balance`)

Current state:
- Active wallet summary path is now shaped from canonical `available/reserved`.
- `demoCredits` remains as a compatibility alias in API/hook payloads.

Residual risk:
- Some non-primary paths still reference `demoCredits` alias (`useCreatorEarningsWallet`, `WalletPageV2`).
- `/api/demo-wallet/summary` still contains legacy fallback logic.

Risk level:
- Low for active Zaurum wallet path after chunk 2.
- Technical debt remains and should be removed in a follow-up compatibility cleanup phase.
