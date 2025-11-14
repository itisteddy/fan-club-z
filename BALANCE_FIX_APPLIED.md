# ✅ Escrow Balance Fix Applied

## Problem Fixed

**User was seeing incorrect "Available to stake" balance** that didn't match what the server was checking.

- **Before:** UI showed $20 available → User tries to bet $5 → Server says "INSUFFICIENT_ESCROW"
- **After:** UI shows actual available balance (accounting for pending locks) → User only sees what they can actually bet

## Root Cause

The UI was reading balance directly from the smart contract, which doesn't know about pending database locks created during bet placement.

## Solution Applied

**Hybrid approach:** Use both sources for complete picture:
1. **Smart Contract** = Total escrow deposited (source of truth for actual funds)
2. **Database (`escrow_locks`)** = Pending reservations (locks for incomplete bets)  
3. **UI displays** = Smart contract escrow MINUS database locks = **True available balance**

## Files Changed

### 1. `client/src/pages/WalletPageV2.tsx`
- ✅ Re-enabled `useWalletSummary()` hook
- ✅ Changed "Available to stake" to use `walletSummary.availableToStakeUSDC` (accounts for locks)

### 2. `client/src/pages/PredictionDetailsPageV2.tsx`
- ✅ Added `useWalletSummary()` hook
- ✅ Changed `availableToStake` to use `walletSummary.availableToStakeUSDC`
- ✅ Bet placement now uses accurate available balance

## How It Works Now

```
User deposits $30 → Smart contract balances[user] = $30
                 → Database escrow_locks = [] (empty)
                 → UI shows "Available: $30" ✓

User attempts $5 bet → Server creates escrow_lock (status='locked', amount=$5)
                    → Database escrow_locks = [{$5, locked}]
                    → UI refreshes, shows "Available: $25" ✓

User attempts $5 bet again → Server creates another lock
                           → Database escrow_locks = [{$5, locked}, {$5, locked}]
                           → UI shows "Available: $20" ✓

User completes first bet → Server marks lock as 'consumed'
                        → Smart contract: balances[user] stays $30 (lock consumed internally)
                        → Database: One lock 'consumed', one still 'locked'
                        → UI shows "Available: $25" ✓

User cancels second bet → Server deletes or marks lock as 'released'
                       → Database: One lock 'consumed', second removed
                       → UI shows "Available: $30" ✓
```

## Testing Steps

1. **Restart the client** to apply changes:
   ```bash
   cd client
   npm run dev
   ```

2. **Navigate to Wallet page** - Check "Available to stake" shows less than escrow total

3. **Try to place a bet** - The available amount should match between UI and server

4. **Expected behavior:**
   - If you have pending locks, "Available" will be less than "Escrow USDC"
   - Bet placement will only fail if you truly don't have enough
   - No more confusion between what UI shows vs what server allows

## Pending Locks Cleanup

Your account currently has multiple pending locks. To clean them up:

**Option 1: Let them expire** (if you implement expiration logic)
**Option 2: Complete the bets** (if the predictions are still open)
**Option 3: Manual cleanup** (run SQL to delete old locks):

```sql
-- View current locks
SELECT id, user_id, prediction_id, amount, status, created_at 
FROM escrow_locks 
WHERE user_id = 'bc1866ca-71c5-4029-886d-4eace081f5c4'
AND (status = 'locked' OR state = 'locked');

-- Delete old locks (older than 1 hour)
DELETE FROM escrow_locks
WHERE user_id = 'bc1866ca-71c5-4029-886d-4eace081f5c4'
AND (status = 'locked' OR state = 'locked')
AND created_at < NOW() - INTERVAL '1 hour';
```

## Future Improvement (Recommended)

Move lock management to the smart contract itself:
- Add `reserve()` and `unreserve()` functions to `FanClubZEscrow.sol`
- Write locks on-chain instead of just in database
- Single source of truth (blockchain)
- No sync issues

See `ESCROW_BALANCE_FIX.md` for full details on this approach.

## Summary

✅ **UI now shows accurate "Available to stake"** balance
✅ **Server and client use same calculation** (escrow - locks)
✅ **No more confusing "Insufficient" errors** when UI shows available balance
✅ **Ready for testing** - restart client and try betting

The fix is applied and ready to test!

