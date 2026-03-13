# Pre-Live Zaurum Migration Inventory

Date: 2026-03-13
Status: Inventory + chunk 1 representation implemented (staging-first)

## Current Ledger / Balance Inventory

| Area | File/Table/Path | Purpose | Current source-of-truth status | Source classification support | Gap |
|---|---|---|---|---|---|
| Legacy demo balance storage | `wallets` table (`currency='DEMO_USD'`, `demo_credits_balance`) | Stores claim/staking rail used by demo route | Active for claim + demo stake rail | Partial (single bucket only) | No explicit split between claim/win/migrated in same rail |
| Main wallet balances | `wallets` table (`currency='USD'`, `available_balance`, `reserved_balance`, `stake_balance`, `creator_earnings_balance`) | Core balances shown in wallet summary | Active | Partial (`creator_earnings_balance` separate; others aggregated) | No explicit `won` vs `legacy_migrated` vs `claim` bucket fields |
| Wallet summary read | [walletRead.ts](/Users/efe/Dev/fanclubz/server/src/routes/walletRead.ts), [walletSummary.ts](/Users/efe/Dev/fanclubz/server/src/routes/walletSummary.ts), [walletBalanceAccounts.ts](/Users/efe/Dev/fanclubz/server/src/services/walletBalanceAccounts.ts) | Provides available/reserved/creator/stake + compatibility fields | Active | Partial | Exposes `demoCredits` but no complete source-bucket model |
| Claim/faucet write path | [demoWallet.ts](/Users/efe/Dev/fanclubz/server/src/routes/demoWallet.ts) (`POST /api/demo-wallet/faucet`) | Daily claim credit + cooldown/idempotency | Active | Implemented | Writes `source_bucket=claim_zaurum` (compat fallback if column unavailable) |
| Stake lock write path | [placeBet.ts](/Users/efe/Dev/fanclubz/server/src/routes/predictions/placeBet.ts) | Debits demo/stake balances and writes bet lock tx | Active | Implemented (debit allocation metadata) | Deterministic bucket spend order added for DEMO stake lock |
| Settlement payouts/fees | [settlement.ts](/Users/efe/Dev/fanclubz/server/src/routes/settlement.ts) | Winner payouts + creator/platform fee credits | Active | Implemented | Demo/crypto payout rows tagged as won; creator fee credits tagged |
| Creator transfer | [walletBalanceAccounts.ts](/Users/efe/Dev/fanclubz/server/src/services/walletBalanceAccounts.ts) + `/api/wallet/transfer-creator-earnings` | Moves creator earnings to stake/available | Active | Partial (`from_account`/`to_account`) | Good for creator accounting; still no unified bucket model for withdrawals |
| Activity/history read | [walletActivity.ts](/Users/efe/Dev/fanclubz/server/src/routes/walletActivity.ts) | Converts transactions to user activity feed | Active | Partial (kind mapping from channel/meta) | Depends on heuristic mapping instead of explicit bucket tags |
| Transaction log endpoint | [transactionLog.ts](/Users/efe/Dev/fanclubz/server/src/routes/wallet/transactionLog.ts) | On-chain tx logging and activity inserts | Active for crypto paths | Partial | Uses `type/channel/meta`, not explicit source-bucket taxonomy |

## Where old demo balances currently live

- `wallets.currency='DEMO_USD'` row per user.
- Also mirrored/consumed via:
  - `wallet_transactions.provider='demo-wallet'`
  - `meta.kind` (`demo_faucet`, `bet_lock`, `payout`, `loss`, etc.)

## How balances are currently computed

- Wallet pages read summary via `/api/wallet/summary/:userId` and compatibility balance accounts.
- Balance account helper currently returns:
  - `demoCredits`
  - `creatorEarnings`
  - `stakeBalance`
  - `stakeReserved`

## Whether current ledger can differentiate sources today

Current capability:
- Claim source: infer from `meta.kind='demo_faucet'`.
- Won source: infer from `meta.kind='payout'`.
- Creator fee source: infer from `channel='creator_fee'` or `to_account='CREATOR_EARNINGS'`.

Conclusion:
- Source classification is now both inferable (`meta.kind`) and queryable (`source_bucket` + wallet bucket fields), with compatibility fallbacks retained.

## Chunk 1 representation chosen

1. `wallet_transactions.source_bucket` (nullable, queryable):
- `claim_zaurum`
- `won_zaurum`
- `creator_fee_zaurum`
- `legacy_migrated_zaurum`
- `mixed` (for debits spanning multiple sources)

2. `wallets` bucket balances:
- `claim_zaurum_balance`
- `won_zaurum_balance`
- `creator_fee_zaurum_balance`
- `legacy_migrated_zaurum_balance`

3. Legacy migration marker/audit fields on `wallets`:
- `legacy_migration_version`
- `legacy_migration_completed_at`
- `legacy_migration_demo_credits`
- `legacy_migration_uncapped_zaurum`
- `legacy_migration_cap_zaurum`

4. Claim-cap enforcement metric:
- cap check uses `claim_zaurum_balance` only.

5. User-facing wallet stays simplified while internal bucket model is available for reconciliation/withdrawal policy.
