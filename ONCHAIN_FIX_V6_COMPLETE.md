# On-Chain Experience Comprehensive Fix v6

## Summary

This document outlines the comprehensive fixes applied to resolve the end-to-end on-chain experience for deposit/withdraw, stake transactions, settlements and fees.

## Issues Addressed

### 1. WalletConnect Session Errors
**Problem:** Unhandled promise rejection: `Error: No matching key. session topic doesn't exist`

**Root Cause:** WalletConnect sessions become stale but aren't cleaned up, causing all subsequent operations to fail with cryptic errors.

**Fix Applied:**
- Enhanced `onchainTransactionService.ts` with comprehensive session error detection (50+ patterns)
- Aggressive cleanup of ALL WalletConnect-related localStorage and sessionStorage entries
- Global error handlers that catch unhandled WC rejections and trigger recovery
- New `useWalletConnectSession` hook with faster recovery (2s cooldown vs 3s)
- Initial cleanup on app mount when not connected
- Periodic cleanup every 60 seconds when disconnected

### 2. ERC20 Allowance Not Propagating
**Problem:** `ERC20: transfer amount exceeds allowance` even after approval transaction is confirmed.

**Root Cause:** After approval tx confirmation, the allowance value hasn't propagated across all RPC nodes. The deposit call reads from a different node that still returns the old allowance.

**Fix Applied:**
- **HARD WAIT (4 seconds)** after approval receipt before any verification starts
- Multi-RPC verification using 3 different endpoints with rotation
- Requires **3 consecutive successful checks** before proceeding
- Parallel RPC queries for final verification (all 3 endpoints checked at once)
- Majority agreement required (5+ out of 9 checks must pass)
- Extended retry limits (80 attempts vs 60)
- Clear progress feedback to user showing current allowance value

### 3. Transaction Logging
**Problem:** Transaction logs weren't reliably reaching the backend, and failed logs were lost.

**Fix Applied:**
- Guaranteed delivery with 3 retry attempts per log
- Local persistence of failed logs in localStorage
- Automatic retry of failed logs on app startup
- Maximum of 100 stored logs to prevent storage bloat
- Skip logs with 5+ failed retries to prevent infinite loops
- Enhanced logging payload with blockNumber, gasUsed, metadata

### 4. Error Propagation to UI
**Problem:** Errors were being swallowed or shown as generic messages.

**Fix Applied:**
- All errors now use `parseOnchainError()` for consistent, user-friendly messages
- Custom error classes: `WalletStateError`, `AllowanceError`, `SessionError`, `TransactionTimeoutError`
- Each error has a code and message that can be displayed to user
- Step-by-step progress indicators with specific messages for each phase
- Error state displayed in modal with dismiss button

### 5. Settlement/Fee Tracking
**Problem:** Transaction hashes weren't being logged consistently for all transaction types.

**Fix Applied:**
- `logTransaction` supports all tx types: `approval`, `deposit`, `withdraw`, `settlement`, `claim`, `bet_lock`, `bet_release`, `post_root`, `fee`, `payout`
- Backend creates `wallet_transactions` records for completed deposits/withdrawals/claims/settlements/fees
- Events logged to `event_log` table for real-time updates
- Reconciliation endpoint called after each successful deposit/withdraw

## Files Modified

### Client-Side

1. **`client/src/services/onchainTransactionService.ts`** (v6 - Complete Rewrite)
   - Enhanced error patterns (50+ session error patterns)
   - Multi-RPC verification with parallel queries
   - Hard delays for chain state propagation
   - Guaranteed transaction logging with retry queue
   - Global error handler installation

2. **`client/src/components/wallet/DepositUSDCModal.tsx`**
   - Added `hard_wait` step after approval
   - Increased retry limits (80 checks)
   - Better progress feedback with current allowance value
   - 60-second operation timeout
   - Parallel final verification

3. **`client/src/components/wallet/WithdrawUSDCModal.tsx`**
   - Consistent error handling with deposit
   - Post-withdraw settle delay (1 second)
   - 60-second operation timeout
   - Improved logging for failures

4. **`client/src/hooks/useWalletConnectSession.ts`**
   - Faster recovery cooldown (2s)
   - 60-second operation timeout
   - Broadcasts errors to UI via events
   - Enhanced session error patterns

5. **`client/src/providers/Web3Provider.tsx`** (v6)
   - `lastError` state for UI display
   - `clearLastError` function
   - Listens for `fcz:wallet:error` events
   - Integration with onchainTransactionService v6

## Deposit Flow (After Fix)

```
1. Validate balance         - Check USDC balance via multi-RPC
2. Check current allowance  - Read from all 3 RPCs
3. If needed: Approve       - Submit approval tx
4. Wait for tx receipt      - Confirm tx mined
5. HARD WAIT 4 seconds      - Let state propagate
6. Verify allowance         - 80 checks with 3 consecutive confirmations
7. Final verification       - Parallel check all 3 RPCs
8. Pre-deposit pause        - 2 seconds
9. Simulate deposit         - Preflight check
10. Submit deposit          - Get tx hash
11. Wait for receipt        - Confirm tx mined
12. Log to backend          - Record in database
13. Reconcile wallet        - Update backend balances
14. Invalidate queries      - Refresh UI
```

## Testing Recommendations

1. **Test deposit with fresh approval**
   - Disconnect wallet, reconnect, deposit
   - Should see hard wait step and allowance checks

2. **Test deposit with existing allowance**
   - Make a second deposit without disconnecting
   - Should skip approval and go straight to deposit

3. **Test session recovery**
   - Open app with stale WC session in localStorage
   - Should auto-cleanup and show reconnect prompt

4. **Test withdrawal**
   - Deposit funds, then withdraw
   - Should show simulation step and confirmation

5. **Test transaction logging**
   - Check backend logs after deposit/withdraw
   - Verify tx hash appears in activity feed

## Known Limitations

- Hard waits add ~6+ seconds to deposit flow when approval needed
- Multi-RPC verification requires network calls to 3 endpoints
- WalletConnect QR modal may need reconnection after session expires
- Testnet (Base Sepolia) may have slower propagation than mainnet

## Environment Variables Used

```
VITE_USDC_ADDRESS_BASE_SEPOLIA=0x036CbD53842c5426634e7929541eC2318f3dCF7e
VITE_BASE_ESCROW_ADDRESS=0x30c60f688A0082D1b761610ec3c70f6dC1374E95
VITE_WALLETCONNECT_PROJECT_ID=00bf3e007580babfff66bd23c646f3ff
```

## Next Steps

1. Monitor production for any remaining session errors
2. Consider reducing hard wait times after confirming stability
3. Add retry button in error state UI
4. Consider server-side session validation
