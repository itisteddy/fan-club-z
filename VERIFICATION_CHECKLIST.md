# Quick Verification Checklist for On-Chain Experience v6

## Files Modified

Run `git diff --stat` or check these files for changes:

### Core Service (Most Important)
- [x] `client/src/services/onchainTransactionService.ts` - Complete v6 rewrite

### Wallet Modals  
- [x] `client/src/components/wallet/DepositUSDCModal.tsx` - Enhanced flow
- [x] `client/src/components/wallet/WithdrawUSDCModal.tsx` - Consistent error handling

### Session Management
- [x] `client/src/hooks/useWalletConnectSession.ts` - Faster recovery
- [x] `client/src/providers/Web3Provider.tsx` - Error state tracking
- [x] `client/src/lib/wagmi.ts` - Multi-RPC exports

### Documentation
- [x] `ONCHAIN_FIX_V6_COMPLETE.md` - Full documentation

## Quick TypeScript Check

```bash
cd client
npm run typecheck
```

If errors, run:
```bash
npm run build 2>&1 | grep -i error | head -20
```

## Manual Test Sequence

### 1. Session Cleanup Test
1. Open DevTools > Application > Local Storage
2. Look for keys starting with `wc@2:` or `walletconnect`
3. If any exist while disconnected, refresh page
4. They should be auto-cleaned

### 2. Deposit Test (Most Critical)
1. Connect MetaMask on Base Sepolia
2. Ensure you have USDC and ETH for gas
3. Open Deposit modal
4. Enter small amount (e.g., $1)
5. Click Deposit
6. **Watch for these steps:**
   - Step 1/5: Validating
   - Step 2/5: Approving (confirm in wallet)
   - Step 3/5: Waiting for propagation (4+ seconds)
   - Step 4/5: Confirming allowance (watch counter go up)
   - Step 5/5: Depositing (confirm in wallet)
7. Should see success toast with BaseScan link

### 3. Session Error Recovery Test
1. Deposit some funds first
2. In DevTools Console, run:
   ```js
   localStorage.setItem('wc@2:client:0.3//pairing', JSON.stringify({topic:"fake",relay:{protocol:"irn"},expiry:0}));
   ```
3. Try to deposit again
4. Should see "Wallet session expired" message
5. Should auto-recover or prompt reconnect

### 4. Withdraw Test
1. After successful deposit, try withdraw
2. Should show 2 steps (validate, withdraw)
3. Confirm in wallet
4. Check balance updated

## Environment Variables Required

```env
# client/.env or .env.local
VITE_USDC_ADDRESS_BASE_SEPOLIA=0x036CbD53842c5426634e7929541eC2318f3dCF7e
VITE_BASE_ESCROW_ADDRESS=0x30c60f688A0082D1b761610ec3c70f6dC1374E95
VITE_WALLETCONNECT_PROJECT_ID=00bf3e007580babfff66bd23c646f3ff
```

## What Each Fix Does

| Issue | Root Cause | Fix |
|-------|------------|-----|
| "No matching key" error | Stale WC sessions | Aggressive localStorage cleanup |
| "transfer amount exceeds allowance" | RPC node lag | 4s hard wait + multi-RPC verification |
| Missing tx logs | No retry on failure | Local persistence + retry queue |
| Session errors crash app | No global handler | Error handler prevents crashes |

## Quick Console Debugging

```js
// Check for stale WC sessions
Object.keys(localStorage).filter(k => k.includes('wc@') || k.includes('walletconnect'))

// Force cleanup
localStorage.getItem('fcz:failedTxLogs') // Check failed logs
```

## Success Criteria

✅ Deposit completes without "allowance" errors
✅ Session errors show user-friendly message (not crash)
✅ Transaction hashes appear in activity feed
✅ Wallet balance updates after deposit/withdraw
✅ Console shows `[FCZ-TX]` and `[FCZ-PAY]` logs

## If Something Goes Wrong

1. Check browser console for `[FCZ-TX]` or `[FCZ-PAY]` logs
2. Look for specific step that failed
3. Common issues:
   - "Insufficient ETH" → Get testnet ETH from faucet
   - "Session expired" → Disconnect and reconnect wallet
   - "Allowance verification failed after 80 attempts" → Network issue, retry
