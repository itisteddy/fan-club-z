# On-Chain Wallet Flow Fixes v7

## Summary of Changes

### Problem 1: Redundant "Wallet action required" cards
**Fixed:** Removed the redundant `StatusCallout` from WalletPageV2. The inline UI (buttons + banner inside the card) already handles all wallet states.

### Problem 2: Multiple toast notifications
**Fixed:** Removed toast from the `fcz:wallet:reconnect-required` event listener in WalletPageV2. The inline UI handles the state display.

### Problem 3: Session errors keep firing in loops
**Fixed:** 
- Simplified `useWalletConnectSession` hook to NOT have its own global error listeners
- Web3Provider has debounced error handling (3 second debounce)
- Single global error handler installed via `initializeOnchainService()`

### Problem 4: Wallet won't reconnect
**Fixed:** The flow now is:
1. Session error detected → cleanup storage → set `needsReconnect = true`
2. UI shows "Reconnect Wallet" button inline
3. User clicks button → opens wallet connect sheet
4. User reconnects → `needsReconnect = false`

## Files Modified

1. **`client/src/pages/WalletPageV2.tsx`**
   - Removed redundant `StatusCallout` component
   - Removed toast from reconnect-required event listener

2. **`client/src/providers/Web3Provider.tsx`** (v7)
   - Added debounce for error handling (3 seconds)
   - Removed duplicate event listeners
   - Cleaner recovery flow

3. **`client/src/hooks/useWalletConnectSession.ts`** (v7)
   - Simplified - no global error listeners (Web3Provider handles that)
   - No toasts (UI components handle display)
   - Just provides cleanup and recovery utilities

## UI Architecture (After Fix)

```
WalletPageV2
├── Balance Cards (top)
│   ├── Wallet USDC
│   └── Escrow Total
│
└── On-chain Balance Card (main card)
    ├── Network Badge + Address + Connect/Disconnect button
    ├── Balance breakdown (wallet, available, locked)
    ├── Inline warning banner (if needsReconnect)
    ├── Action buttons (Deposit/Withdraw OR Reconnect/disabled)
    └── Activity lists
```

When `needsReconnect = true`:
- Inline amber banner shows "Wallet session expired..."
- Buttons change to "Reconnect Wallet" + disabled "Withdraw"
- No separate StatusCallout card
- No toast spam

## Testing Steps

1. **Test normal flow:**
   - Connect wallet → should work normally
   - Deposit → should complete with progress steps
   - Withdraw → should complete

2. **Test session error recovery:**
   - Connect wallet
   - In console: `localStorage.setItem('wc@2:client:0.3//pairing', '{}')`
   - Try to deposit
   - Should see session error caught in console
   - UI should show "Reconnect Wallet" button (inline, NOT separate card)
   - Click reconnect → open wallet sheet → reconnect
   - Should work normally again

3. **Test cold start with stale sessions:**
   - Disconnect wallet
   - Add stale WC data: `localStorage.setItem('wc@2:test', 'stale')`
   - Refresh page
   - Should auto-cleanup stale sessions
   - Console: `[FCZ-TX] Cleaned X stale WalletConnect sessions`
