# Payment Architecture Cleanup Plan

## Current Issues Identified

### 1. Balance Calculation Confusion
- **Problem**: Multiple sources of truth for balance (on-chain escrow vs database locks)
- **Impact**: Users see inconsistent available balances
- **Root Cause**: `useWalletSummary` returns database-calculated `availableToStakeUSDC` which doesn't match on-chain `useEscrowBalance().availableUSD`

### 2. Transaction Flow Gaps
- **Missing**: Clear settlement/payout flow when predictions resolve
- **Missing**: Proper escrow lock consumption tied to on-chain reserved balance
- **Missing**: Automated reconciliation between on-chain events and database state

### 3. UI/UX Inconsistencies
- **Wallet Page**: Shows 3 cards but meanings overlap (Wallet USDC, In Escrow, Available)
- **Prediction Details**: "Available to stake" uses database calculation, not on-chain
- **Activity Feed**: Mixes wallet_transactions and escrow_locks without clear distinction

### 4. Server-Side Issues
- **walletSummary route**: Returns stale database balances instead of forcing on-chain reads
- **walletReconciliation service**: Complex logic that tries to sync database with on-chain but adds latency
- **place-bet endpoint**: Missing or incomplete - uses old demo flow

## Proposed Architecture

### Core Principles
1. **On-chain is source of truth** for current balances
2. **Database is append-only log** for transaction history
3. **Simple, predictable flow** for all money movement

### Data Flow

```
┌─────────────────┐
│  User's Wallet  │ (MetaMask/Coinbase)
│   USDC Balance  │ ← useUSDCBalance() reads ERC20
└────────┬────────┘
         │ deposit()
         ▼
┌─────────────────┐
│ Escrow Contract │ (Base Sepolia)
│  ┌───────────┐  │
│  │ Available │  │ ← useEscrowBalance().availableUSD
│  ├───────────┤  │
│  │ Reserved  │  │ ← useEscrowBalance().reservedUSD
│  └───────────┘  │
└────────┬────────┘
         │ placeBet() / settle()
         ▼
┌─────────────────────────────────┐
│  Database (Transaction Log)      │
│  ┌───────────────────────────┐  │
│  │ wallet_transactions       │  │ ← append-only
│  │ - deposits                │  │
│  │ - withdrawals             │  │
│  │ - bet_placed              │  │
│  │ - payouts                 │  │
│  └───────────────────────────┘  │
│  ┌───────────────────────────┐  │
│  │ prediction_entries        │  │ ← tracking only
│  │ - bet details             │  │
│  │ - potential_payout        │  │
│  └───────────────────────────┘  │
└─────────────────────────────────┘
```

### Transaction Types

#### 1. Deposit Flow
```
User Wallet → approve USDC → Escrow.deposit()
   ↓
Database: INSERT wallet_transactions
   type: 'deposit'
   channel: 'escrow_deposit'
   direction: 'credit'
   tx_hash: <blockchain_hash>
```

#### 2. Bet Placement Flow
```
Escrow.reserve() → marks funds as reserved on-chain
   ↓
Database: INSERT prediction_entries
   amount: X
   escrow_lock_id: NULL (deprecated - we don't use locks anymore)
   ↓
Database: INSERT wallet_transactions
   type: 'bet_placed'
   channel: 'escrow_consumed'
   direction: 'debit'
   prediction_id: Y
```

#### 3. Settlement/Payout Flow (MISSING - TO IMPLEMENT)
```
Escrow.settle() → releases reserved, pays out winners
   ↓
Database: INSERT wallet_transactions
   type: 'payout'
   channel: 'escrow_payout'
   direction: 'credit'
   prediction_id: Y
   ↓
Update prediction_entries
   status: 'won' | 'lost'
   actual_payout: Z
```

#### 4. Withdrawal Flow
```
Escrow.withdraw() → transfers to user wallet
   ↓
Database: INSERT wallet_transactions
   type: 'withdraw'
   channel: 'escrow_withdraw'
   direction: 'debit'
   tx_hash: <blockchain_hash>
```

## Implementation Plan

### Phase 1: Simplify Balance Display (Priority 1)
- [x] Document current architecture
- [ ] Remove `useWalletSummary` from balance calculations
- [ ] Update WalletPageV2 to use only on-chain hooks
- [ ] Update PredictionDetailsPageV2 "Available to stake" to use on-chain only
- [ ] Remove confusing "Available" card from wallet - keep only:
  - Wallet USDC (ERC20)
  - Escrow Total (available + reserved)

### Phase 2: Implement Settlement Flow (Priority 1)
- [ ] Create `/api/predictions/:id/settle` endpoint
- [ ] Implement Escrow.settle() contract call
- [ ] Record payout transactions in database
- [ ] Update prediction status to 'settled'
- [ ] Update prediction_entries with actual_payout

### Phase 3: Clean Up Transaction History (Priority 2)
- [ ] Standardize wallet_transactions schema
- [ ] Remove escrow_locks table (deprecated)
- [ ] Simplify useWalletActivity to only read wallet_transactions
- [ ] Add clear icons/labels for each transaction type

### Phase 4: Improve UI/UX (Priority 2)
- [ ] Unified activity feed design across wallet and prediction pages
- [ ] Clear visual distinction between deposits, bets, and payouts
- [ ] Show pending transactions (mempool) with loading states
- [ ] Add transaction details modal with blockchain explorer link

### Phase 5: Automated Reconciliation (Priority 3)
- [ ] Background job to sync on-chain events to database
- [ ] Handle missed transactions gracefully
- [ ] Admin dashboard to view reconciliation status

## File Changes Required

### Client Files to Update
1. `/client/src/pages/WalletPageV2.tsx` - Simplify balance display
2. `/client/src/pages/PredictionDetailsPageV2.tsx` - Use on-chain balance only
3. `/client/src/hooks/useWalletSummary.ts` - Add deprecation warnings
4. `/client/src/hooks/useWalletActivity.ts` - Simplify to only read transactions
5. `/client/src/components/wallet/DepositUSDCModal.tsx` - Already correct
6. `/client/src/components/wallet/WithdrawUSDCModal.tsx` - Need to check

### Server Files to Update
1. `/server/src/routes/walletSummary.ts` - Deprecate or remove
2. `/server/src/routes/walletActivity.ts` - Simplify queries
3. `/server/src/routes/predictions.ts` - Add settle endpoint
4. `/server/src/services/walletReconciliation.ts` - Simplify or remove

### New Files to Create
1. `/server/src/routes/settlement.ts` - Handle prediction settlements
2. `/server/src/services/escrowService.ts` - Interact with escrow contract
3. `/client/src/hooks/useSettlement.ts` - Client-side settlement hook

## Success Criteria
- [ ] Users see consistent balance across all pages
- [ ] Clear distinction between wallet USDC and escrow balance
- [ ] Prediction settlement flow works end-to-end
- [ ] Activity feed shows complete transaction history
- [ ] No confusion about "available" vs "reserved" balances
- [ ] All on-chain operations are reflected in UI within 5 seconds
