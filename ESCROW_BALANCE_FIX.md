# Critical Fix: Escrow Balance Calculation

## Problem Identified

**User sees incorrect "Available to stake" balance** - shows $20 but bet placement fails with "INSUFFICIENT_ESCROW"

### Root Cause

The client is reading escrow balance directly from the smart contract, which doesn't know about pending database locks created during bet placement attempts.

**Current (BROKEN) Flow:**
```
User attempts $5 bet
  ↓
Server creates lock in database (status='locked', amount=$5)
  ↓
Server responds: "INSUFFICIENT_ESCROW" (because it knows about all locks)
  ↓
Client still shows $20 "Available" (because smart contract doesn't know about locks)
  ↓
USER CONFUSION: "Why can't I bet if I have $20 available?"
```

### Architecture Issue

**Smart Contract State:**
- `balances[user]` = Total deposited ($20)
- `reserved[user]` = Should track locks, but NOT being updated

**Database State (`escrow_locks` table):**
- Multiple rows with `status='locked'` (pending bets)
- These locks are NOT written to the smart contract

## The Fix

### Option 1: **Write Locks to Smart Contract** (RECOMMENDED)

Update the bet placement flow to call smart contract's `reserve()` function when creating locks.

**Benefits:**
- Single source of truth (blockchain)
- Smart contract enforces balance limits
- No sync issues between DB and chain

**Changes Required:**

1. **Add to `server/src/lib/chain/escrow.ts`:**
```typescript
export async function reserveEscrow(
  userId: string,
  amount: number,
  predictionId: string
): Promise<string> {
  // Call escrow.reserve(amount) on-chain
  // Returns transaction hash
}
```

2. **Update `server/src/routes/predictions/placeBet.ts`:**
```typescript
// Before creating DB lock, reserve on-chain
const txHash = await reserveEscrow(userId, amountUSD, predictionId);

// Then create DB lock with tx_ref = txHash
const { data: lock } = await supabase
  .from('escrow_locks')
  .insert({
    user_id: userId,
    prediction_id: predictionId,
    amount: amountUSD,
    status: 'locked',
    tx_ref: txHash, // Link to on-chain transaction
    // ...
  });
```

3. **Client automatically works** because `useEscrowBalance()` already reads `reserved` from smart contract.

---

### Option 2: **Hybrid - Database for Locks, Smart Contract for Total** (CURRENT, needs fix)

Keep database locks but ensure client accounts for them.

**Changes Required:**

1. **Re-enable `useWalletSummary` in `WalletPageV2.tsx`:**
```typescript
// This hook queries /api/wallet/summary which calculates:
// availableToStakeUSDC = escrow - reserved (from escrow_locks table)
const { data: walletSummary } = useWalletSummary(user?.id);

// Display:
const availableToStake = walletSummary?.availableToStakeUSDC ?? 0;
```

2. **Update all bet CTAs** to use this value instead of smart contract balance.

3. **Add server-side reconciliation** to periodically sync database locks with smart contract state.

**Issues with this approach:**
- Two sources of truth (chain + DB)
- Risk of desync
- More complex reconciliation logic
- User can bypass locks by interacting directly with smart contract

---

## Recommended Solution: Option 1

**Write locks to smart contract immediately when user attempts bet.**

### Implementation Steps:

1. Add `FanClubZEscrow.sol` functions (if not present):
```solidity
function reserve(uint256 amount) external {
    require(balances[msg.sender] >= reserved[msg.sender] + amount, "Insufficient balance");
    reserved[msg.sender] += amount;
    emit Reserved(msg.sender, amount);
}

function unreserve(uint256 amount) external {
    require(reserved[msg.sender] >= amount, "Nothing to unreserve");
    reserved[msg.sender] -= amount;
    emit Unreserved(msg.sender, amount);
}

function consumeReservation(uint256 amount) external {
    require(reserved[msg.sender] >= amount, "Insufficient reservation");
    reserved[msg.sender] -= amount;
    balances[msg.sender] -= amount;
    emit ReservationConsumed(msg.sender, amount);
}
```

2. Add server-side chain interaction layer
3. Update bet placement to call `reserve()` on-chain
4. Update bet consumption to call `consumeReservation()` on-chain
5. Client's `useEscrowBalance()` automatically reflects correct available balance

### Migration Path

1. Deploy updated escrow contract with reserve functions
2. Update server to write locks on-chain
3. Clean up old database locks (one-time)
4. Remove database lock reconciliation code

---

## Immediate Workaround (Quick Fix)

Until proper fix is implemented, **re-enable `useWalletSummary`** hook:

**File: `client/src/pages/WalletPageV2.tsx`**

Change:
```typescript
// const { data: walletSummary } = useWalletSummary(user?.id);
const availableToStake = escrowAvailableUSD; // WRONG - doesn't account for locks
```

To:
```typescript
const { data: walletSummary } = useWalletSummary(user?.id);
const availableToStake = walletSummary?.availableToStakeUSDC ?? 0; // CORRECT - accounts for locks
```

This will at least show users the correct available balance, matching what the server sees.

---

## Testing After Fix

1. Deposit $30 to escrow
2. Attempt to place $5 bet (creates lock)
3. **Verify:** "Available to stake" immediately shows $25 (not $30)
4. Attempt another $5 bet (creates another lock)
5. **Verify:** "Available to stake" shows $20
6. Complete first bet (consumes lock)
7. **Verify:** "Available to stake" still shows $20 (lock consumed)
8. Cancel second bet (releases lock)
9. **Verify:** "Available to stake" shows $25

---

## Decision Needed

**Which approach do you want to take?**

- **Option 1** (Recommended): Update smart contract to handle reservations on-chain
- **Option 2** (Quick): Re-enable database summary for available balance calculation

Let me know and I'll implement the full solution!

