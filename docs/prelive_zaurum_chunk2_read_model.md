# Pre-Live Zaurum Chunk 2 — User-Facing Read-Model Alignment

Date: 2026-03-13
Status: In progress (build + staging validation pending)

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

To be filled after build + staging run.
