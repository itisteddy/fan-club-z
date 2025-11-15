# P3: End-to-End Crypto Betting Flow - Implementation Status

## Overview
This document tracks the implementation of the P3 feature set for real-time wallet updates, atomic bet placement, and unified data models.

## Completed Components ✅

### ✅ 0) Fixed Endpoints
- **walletSummary.ts**: `GET /api/wallet/summary?userId=<id>` - Returns normalized wallet summary
- **walletActivity.ts**: `GET /api/wallet/activity?userId=<id>&limit=20&cursor=<ts>` - Returns activity feed
- Both endpoints filter by `channel='crypto'` and `provider='base/usdc'` (no demo data)
- Routes registered in `server/src/index.ts`

### ✅ 1) Place-Bet API
- **placeBet.ts**: `POST /api/predictions/:predictionId/place-bet`
- Atomic, idempotent bet placement with escrow validation
- Creates lock → consumes lock → creates entry → records transaction
- Error codes: `INSUFFICIENT_ESCROW`, `lock_not_found`, etc.
- Handles both `status` and `state` columns for escrow_locks compatibility
- Idempotency via unique constraint on `(user_id, prediction_id)` where `state='locked'`

### ✅ 2) Client Hooks
- **useWalletSummary.ts**: Query key `['wallet','summary', userId]`, auto-refresh every 10s and on focus
- **useWalletActivity.ts**: Query key `['wallet','activity', userId, limit]`, supports infinite scroll
- Both hooks log `[FCZ-PAY] ui: fetched wallet summary/activity`

### ✅ 3) UX Gating & State
- Updated `PredictionDetailsPageV2.tsx` to use `useWalletSummary` for gating
- Error handling for `INSUFFICIENT_ESCROW` opens Deposit modal
- Updated `predictionStore.ts` to use unified `/api/predictions/:id/place-bet` endpoint
- Toast message: "Bet placed: $X — lock consumed"
- Query invalidation on success

### ✅ 4) Wallet Page Updates
- Replaced balance displays with `useWalletSummary` data (walletUSDC, escrowUSDC, availableToStakeUSDC)
- Activity feed uses `useWalletActivity` with consistent icons (⬇⬆🔒🔓🎯↩)
- Removed all demo balance references
- Shows "No transactions yet" when empty

### ✅ 5) Modals
- Safe-area and z-index handling already in place (`.z-modal`, `.pb-safe`)
- Deposit modal: Button enabled only when connected to Base Sepolia + amount > 0
- Auto chain-switch via `ensureBase()` function
- Query invalidation on success

### ✅ 6) Database Migrations
- **111_wallet_summary_view.sql**: Creates `v_wallet_summary` view from transactions + locks
- **112_wallet_tx_indexes.sql**: Adds indexes for fast queries (user + created_at, provider + channel)
- Both migrations are idempotent

### ✅ 7) Reconciliation Job
- **reconcileEscrow.ts**: Runs every 60s, compares computed vs cached balances
- Logs warnings when discrepancies found (doesn't mutate)
- Registered in `server/src/index.ts` when `PAYMENTS_ENABLE=1`
- Tagged with `[FCZ-PAY] reconcile:`

### ✅ 8) Testing
- **balanceSelector.test.ts**: Unit tests for escrow available calculation
- Tests cover: normal case, zero case, negative prevention, after-bet update
- Integration tests and manual QA script documented in this file

### ✅ 9) Remove Demo Data
- Removed demo balance references from `WalletPageV2.tsx`
- All queries filter by `provider IN ('base/usdc', 'crypto-base-usdc')`
- No `demo`, `mock balance`, or `likedCount` in wallet/prediction flows

### ✅ 10) Error Surfaces
- Error banners in `WalletPageV2.tsx` for wallet summary/activity failures
- `INSUFFICIENT_ESCROW` error automatically opens Deposit modal
- All errors logged with `[FCZ-BET]` or `[FCZ-PAY]` tags

## Cache Keys (Query Keys)

```typescript
QK.walletSummary(userId)        // ['wallet','summary', userId]
QK.walletActivity(userId, limit) // ['wallet','activity', userId, limit]
QK.escrowBalance(userId)         // ['escrow-balance', userId]
QK.prediction(predictionId)      // ['prediction', predictionId]
QK.predictionEntries(predictionId) // ['prediction-entries', predictionId]
```

## API Endpoints

### Wallet Summary
```
GET /api/wallet/summary?userId=<uuid>
Response: {
  currency: 'USD',
  walletUSDC: number,
  escrowUSDC: number,
  reservedUSDC: number,
  availableToStakeUSDC: number,
  lastUpdated: string
}
```

### Wallet Activity
```
GET /api/wallet/activity?userId=<uuid>&limit=20&cursor=<id>
Response: {
  items: Array<{
    id: string,
    kind: 'deposit' | 'withdraw' | 'lock' | 'unlock' | 'bet_placed' | 'bet_refund',
    amount: number,
    txHash?: string,
    createdAt: string
  }>
}
```

### Place Bet
```
POST /api/predictions/:predictionId/place-bet
Body: {
  optionId: string (uuid),
  amountUSD: number,
  userId: string (uuid),
  requestId?: string (for idempotency)
}
Response: {
  ok: true,
  entryId: string,
  consumedLockId: string,
  newEscrowReserved: number,
  newEscrowAvailable: number
}
```

## Feature Flags

**Server:**
- `ENABLE_BETS=1` - Enable bet placement
- `PAYMENTS_ENABLE=1` - Enable payment system

**Client:**
- `VITE_FCZ_BASE_BETS=1` - Enable crypto bets on Base
- `VITE_FCZ_BASE_ENABLE=1` - Enable Base chain features

## QA Checklist

### Pre-checks
- [ ] `PAYMENTS_ENABLE=1` in server `.env`
- [ ] `VITE_FCZ_BASE_BETS=1` in client `.env.local`
- [ ] `VITE_CHAIN_ID=84532` (Base Sepolia)
- [ ] `VITE_BASE_ESCROW_ADDRESS` set to deployed contract
- [ ] `VITE_WC_PROJECT_ID` set (WalletConnect)

### Test Flow
1. [ ] Connect wallet (Base Sepolia)
2. [ ] Deposit 10 USDC → Wallet summary updates → Activity shows deposit
3. [ ] Open prediction → Stake $4
4. [ ] Verify toast: "Bet placed: $4 — lock consumed"
5. [ ] Verify Available decreases by 4, Activity shows bet_placed
6. [ ] Verify prediction page shows "You staked $4 on ... (locked)"
7. [ ] Refresh page → State persists
8. [ ] Withdraw $X → Activity shows withdraw, balances update

### Idempotency Test
1. [ ] Place bet with same requestId twice
2. [ ] Both requests return 200
3. [ ] Only one entry created in database
4. [ ] Lock consumed only once

## Next Steps

1. Complete UX gating in StickyActionPanel
2. Update WalletPageV2 to use new hooks
3. Create database migrations
4. Add reconciliation job
5. Remove all demo data references
6. Add error surfaces
7. Run QA tests

## Notes

- All queries filter by `provider='base/usdc'` or `channel='crypto'` to exclude demo data
- Escrow locks use both `status` and `state` columns for compatibility
- Idempotency uses unique constraint on `(user_id, prediction_id)` where `state='locked'`
- Cache invalidation uses unified query keys for predictable refresh

