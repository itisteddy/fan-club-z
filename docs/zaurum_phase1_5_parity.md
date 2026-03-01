# Zaurum Phase 1.5: Economic Parity Harness

## Purpose
The Economic Parity Harness ensures that the economic logic and rounding behavior of the old `DEMO_USD` system perfectly matches the new `ZAU` ledger-backed system. It proves that we did not change the economics (claim, stake, settle, fees) during the Phase 1 refactor.

## Execution Method (Option 1)
Given the difficulty of running "both modes" simultaneously on the same production endpoint (since Phase 1 replaced the `transfer` and `credit` underlying paths in `WalletService`), the harness runs in an isolated Node script.

It sets up an identical test fixture in two virtual spaces (or one transaction block that rolls back) using:
- **Baseline**: The old canonical direct `UPDATE wallets` and `INSERT INTO wallet_transactions` SQL queries.
- **Candidate**: The new `WalletService` methods.

Since the actual `poolMath.ts` and `settlement.ts` logic remains exactly the same for payouts, the key parity we verify is:
1. Lock / Unlock transfers.
2. Payout credits.
3. Fee routing (Treasury + Creator).

## How to Run
```bash
npm --prefix server run test:parity
```
Or directly:
```bash
npx tsx server/src/scripts/parity-runner.ts
```

## Scenarios Included
1. **S1: Simple Stake + Settlement**:
   - Bettor A and B claim.
   - Bettor A stakes 100 on Outcome 1.
   - Bettor B stakes 100 on Outcome 2.
   - Settle Outcome 1 wins.
   - Verifies available/locked balances, payouts, and fee distribution.
2. **S2: Multi-Stake**:
   - Bettor A stakes twice on the same outcome.
   - Bettor B stakes once.
   - Settle and verify correct aggregated payouts.
3. **S3: Exact Amount**:
   - User stakes exactly their total balance.
   - Verifies no "insufficient funds" errors due to floating point precision.

## Passing Criteria
- All balances (PROMO_AVAILABLE, PROMO_LOCKED, CREATOR_EARNINGS) match perfectly between Legacy and Zaurum modes.
- `wallet_accounts` invariants are maintained (`balance >= 0`).
- Ledger entries sum to `0` across all accounts (except for `OPENING_BALANCE` and `DAILY_CLAIM` mints).
- Generates a report file with `PASS` status.

## Artifacts
- JSON Report: `/tmp/zaurum-parity-report.json`
- Human Readable Report: `/tmp/zaurum-parity-report.md`
