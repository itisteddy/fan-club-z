# Zaurum Phase 0 Inventory (Dual -> Zaurum-only)

Date: 2026-02-28

## Wallet mode flags (source of truth)

- Backend env: `FCZ_WALLET_MODE` (`dual` | `zaurum_only`) default `dual`
- Frontend env: `VITE_FCZ_WALLET_MODE` (`dual` | `zaurum_only`) default `dual`

Current wiring:
- `server/src/config/index.ts` -> `config.features.walletMode`
- `client/src/config/env.schema.ts` -> validates frontend mode
- `client/src/config/env.ts` + `client/src/config/env.client.ts` -> reads mode
- `client/src/utils/environment.ts` -> exports `FCZ_WALLET_MODE`
- `client/src/config/index.ts` -> `config.features.walletMode`

Phase 0 behavior note:
- No runtime gating enabled yet. Default `dual` keeps current behavior.

---

## Inventory: server money/crypto paths

| File | Purpose | Phase 1 Action |
|---|---|---|
| `server/src/routes/predictions/placeBet.ts` | stake placement (quote, debit/lock, top-up flow, position updates) | **Keep + modify** (zaurum currency only, remove crypto assumptions) |
| `server/src/services/stakeQuote.ts` | canonical odds/payout quote math | **Keep** |
| `server/src/routes/settlement.ts` | settlement, payouts, creator/platform fee credits, disputes hooks | **Keep + modify** (disable on-chain branches in zaurum-only) |
| `server/src/services/settlementOddsV2.ts` | pool v2 fee/payout math | **Keep** |
| `server/src/services/settlementResults.ts` | settlement result persistence | **Keep** |
| `server/src/services/walletBalanceAccounts.ts` | creator earnings credit/transfer, wallet account summary | **Keep + modify** (rename UI semantics to Zaurum, keep balance integrity) |
| `server/src/routes/walletRead.ts` | wallet summary, creator transfer endpoint, creator history | **Keep + modify** (zaurum-only payload shape) |
| `server/src/routes/walletSummary.ts` | wallet summary snapshot endpoint | **Keep + modify** |
| `server/src/routes/walletReconcile.ts` | reconcile endpoint for wallet snapshots | **Modify** (reconcile strategy without crypto rail) |
| `server/src/services/walletReconciliation.ts` | on-chain + db merge logic | **Modify heavily** (zaurum internal ledger source) |
| `server/src/routes/walletActivity.ts` | wallet activity feed shaping | **Keep + modify** (remove crypto-only event kinds) |
| `server/src/routes/wallet/transactionLog.ts` | transaction logging (deposit/withdraw/claim/etc) | **Keep + modify** |
| `server/src/routes/demoWallet.ts` | demo faucet + demo wallet operations | **Keep** (becomes primary non-crypto mode component) |
| `server/src/routes/fiatPaystack.ts` | fiat deposit callback + credits | **Modify/possibly disable** based on final Zaurum funding design |
| `server/src/routes/fiatWithdrawals.ts` | fiat withdrawal requests and lifecycle | **Modify/possibly disable** based on final Zaurum funding design |
| `server/src/routes/admin/withdrawals.ts` | admin approve/reject/mark paid withdrawals | **Modify/possibly disable** |
| `server/src/routes/escrow.ts` | escrow lock/unlock routes | **Keep + modify** (internal rail only) |
| `server/src/routes/admin/settlements.ts` | admin settlement queue/retry/finalize orchestration | **Keep + modify** |
| `server/src/routes/admin/wallets.ts` | admin wallet inspection endpoints | **Keep + modify** |
| `server/src/chain/base/client.ts` | Base chain client | **Remove/disable in zaurum-only** |
| `server/src/chain/base/deposits.ts` | base deposit watcher (legacy path) | **Remove/disable in zaurum-only** |
| `server/src/chain/base/depositWatcher.ts` | robust base deposit watcher + checkpointing | **Remove/disable in zaurum-only** |
| `server/src/chain/base/addressRegistry.ts` | chain address lookup | **Remove/disable in zaurum-only** |
| `server/src/services/escrowContract.ts` | on-chain escrow contract integration | **Remove/disable in zaurum-only** |
| `server/src/cron/reconcileEscrow.ts` | periodic escrow reconciliation cron | **Modify** (remove on-chain reconciliation dependency) |
| `server/src/cron/expireLocks.ts` | lock expiration cron | **Keep** |

---

## Inventory: client wallet/crypto paths

| File | Purpose | Phase 1 Action |
|---|---|---|
| `client/src/pages/UnifiedWalletPage.tsx` | main wallet page UX/state | **Keep + modify** (zaurum copy + hide crypto actions) |
| `client/src/pages/WalletPageV2.tsx` | wallet variant page | **Keep + modify** |
| `client/src/components/wallet/ConnectWalletSheet.tsx` | wallet connect UX | **Disable in zaurum-only** |
| `client/src/components/wallet/DepositUSDCModal.tsx` | crypto deposit flow UI | **Disable/remove in zaurum-only** |
| `client/src/components/wallet/WithdrawUSDCModal.tsx` | crypto withdraw flow UI | **Disable/remove in zaurum-only** |
| `client/src/components/wallet/FiatDepositSheet.tsx` | fiat deposit UX | **Keep/modify per Zaurum funding direction** |
| `client/src/components/wallet/FiatWithdrawalSheet.tsx` | fiat withdrawal UX | **Keep/modify per Zaurum funding direction** |
| `client/src/providers/Web3Provider.tsx` | wagmi provider bootstrap | **Disable in zaurum-only** |
| `client/src/lib/wagmi.ts` | wagmi connector config | **Disable in zaurum-only** |
| `client/src/lib/wallet/connectOrchestrator.ts` | wallet connect state machine/orchestration | **Disable in zaurum-only** |
| `client/src/lib/wallet/useWalletConnectionController.ts` | wallet connection controller hook | **Disable in zaurum-only** |
| `client/src/lib/wallet/walletConfig.ts` | connector metadata/config | **Disable in zaurum-only** |
| `client/src/lib/cryptoFeatureFlags.ts` | crypto UI feature flags | **Modify** to derive from wallet mode |
| `client/src/lib/walletModeSettings.ts` | frontend/server wallet mode sync helper | **Keep + consolidate as mode authority** |
| `client/src/hooks/useUnifiedBalance.ts` | unified balance retrieval | **Keep + modify** |
| `client/src/hooks/useCreatorEarningsWallet.ts` | creator earnings wallet state | **Keep** |
| `client/src/lib/chain/base/useSwitchToBase.ts` | switch chain helper | **Disable in zaurum-only** |
| `client/src/lib/chain/base/txHelpers.ts` | on-chain tx helpers | **Disable in zaurum-only** |

---

## Inventory: jobs/scheduled/background touching wallets

| File | Purpose | Phase 1 Action |
|---|---|---|
| `server/src/cron/reconcileEscrow.ts` | background wallet reconciliation | **Modify** |
| `server/src/cron/expireLocks.ts` | expire stale escrow locks | **Keep** |
| `server/src/chain/base/depositWatcher.ts` | on-chain deposit polling/checkpointing | **Disable/remove** |
| `server/src/chain/base/deposits.ts` | alternate deposit watcher path | **Disable/remove** |

---

## Money mutation audit (server-side only)

### Direct balance mutations

1. `POST /api/predictions/:predictionId/place-bet` and `/api/v1/predictions/:predictionId/place-bet`  
   File: `server/src/routes/predictions/placeBet.ts`  
   Mutation: debit/lock stake, upsert/increment position, pool updates, transaction/event records.

2. `POST /api/wallet/transfer-creator-earnings`  
   File: `server/src/routes/walletRead.ts` -> `transferCreatorEarningsToStake` in `server/src/services/walletBalanceAccounts.ts`  
   Mutation: `creator_earnings_balance` down, `stake_balance` and `available_balance` up, transaction row insert.

3. `creditCreatorEarnings(...)`  
   File: `server/src/services/walletBalanceAccounts.ts`  
   Mutation: creator earnings credits into wallet + transaction row insert (idempotent by external ref).

4. `POST /api/demo-wallet/faucet`  
   File: `server/src/routes/demoWallet.ts`  
   Mutation: increments demo wallet `demo_credits_balance` + `available_balance` + wallet transaction insert.

5. Settlement execution paths (`manual`, `manual/merkle`, auto settle flows)  
   File: `server/src/routes/settlement.ts`  
   Mutation: winner payouts, loser debits/finalization bookkeeping, creator/platform fee credits, settlement records.

6. Wallet transaction logger endpoint  
   File: `server/src/routes/wallet/transactionLog.ts`  
   Mutation: writes wallet transaction rows used by activity/history and downstream accounting.

### Crypto / deposit / withdraw mutation paths

7. Base chain deposit watcher credits  
   Files: `server/src/chain/base/depositWatcher.ts`, `server/src/chain/base/deposits.ts`  
   Mutation: deposit transaction ingestion + wallet credit updates.

8. Fiat deposit callbacks  
   File: `server/src/routes/fiatPaystack.ts`  
   Mutation: deposit completion updates wallet balances + ledger rows.

9. Fiat withdrawal request lifecycle  
   Files: `server/src/routes/fiatWithdrawals.ts`, `server/src/routes/admin/withdrawals.ts`  
   Mutation: reserve/debit/release balances depending on withdrawal state transitions.

10. Admin settlement orchestration/finalization  
    File: `server/src/routes/admin/settlements.ts`  
    Mutation: triggers settlement jobs and finalization side effects; may write payout/fee records.

---

## Phase 1 keep/modify/remove summary

- Keep core pool math, staking, settlement, creator earnings accounting.
- Modify wallet summary/reconcile/activity to use a single Zaurum rail without crypto assumptions.
- Disable/remove web3 providers, WalletConnect/wagmi flows, on-chain watcher and chain-specific branches when mode is `zaurum_only`.
