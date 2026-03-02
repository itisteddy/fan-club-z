# P1→P2 Implementation Plan: UI Wiring & Withdrawals

## ✅ Current Status (P1 Complete)

- ✅ Smart contract deployed: `0x5B966ca41aB58E50056EE1711c9766Ca3382F115`
- ✅ Deposit watcher running (HTTP polling mode)
- ✅ First test deposit detected and credited (10 USDC)
- ✅ Database schema complete
- ✅ Health endpoints working

## 🎯 P2 Goals

### 1. Verification Steps (Right Now - 2-3 mins)

#### Ledger Sanity Check
Run `verify-ledger-sanity.sql` in Supabase to confirm:
- ✅ New deposit row in `wallet_transactions`
- ✅ `available_balance` increased by same amount
- ✅ Event log has base-watcher entry

#### Watcher Health Check
- GET `/api/health/payments` → watcher up, no errors
- GET `/api/health/base` → chainId=84532, addresses resolved

### 2. UI Wiring Tasks

#### Task 1: Wallet Page Updates (`WalletPageV2.tsx`)
- [ ] Add wallet status row (connect/disconnect) in balance card area
- [ ] Replace demo balances with `balanceSelector.ts`
- [ ] Render `CryptoBalanceCard` component
- [ ] Add Recent Activity section with 10s auto-refresh

#### Task 2: Create `useOnchainActivity` Hook
- [ ] Calls `/api/chain/activity?limit=20`
- [ ] Auto-refreshes every 10 seconds
- [ ] Returns formatted activity items

#### Task 3: Modal Improvements
- [ ] **DepositUSDCModal**: Auto chain-switch, wait for receipt, invalidate queries
- [ ] **WithdrawUSDCModal**: Validate amount, wait for receipt, invalidate queries
- [ ] Fix z-index and safe-area issues
- [ ] ESC and click-outside to close

#### Task 4: Prediction Gating (`StickyActionPanel.tsx`)
- [ ] Not signed in → "Sign in to predict"
- [ ] Base bets enabled + no wallet → "Connect wallet"
- [ ] Insufficient escrow → "Add funds (need $X)"
- [ ] Stake input max = `escrowAvailable`

#### Task 5: Remove Demo Balances
- [ ] Audit all imports of demo balance utilities
- [ ] Replace with real ledger selectors
- [ ] Ensure no fake balances anywhere

#### Task 6: Testing & Polish
- [ ] Unit tests for `balanceSelector.ts`
- [ ] Dev logs with `[FCZ-PAY] ui:` prefix
- [ ] No console errors
- [ ] All feature flags respected

## 📝 Files to Modify

### Client Files
1. `client/src/pages/WalletPageV2.tsx` - Main UI wiring
2. `client/src/hooks/useOnchainActivity.ts` - NEW: Activity polling
3. `client/src/components/wallet/CryptoBalanceCard.tsx` - Polish
4. `client/src/components/wallet/DepositUSDCModal.tsx` - Behavior improvements
5. `client/src/components/wallet/WithdrawUSDCModal.tsx` - Behavior improvements
6. `client/src/components/predictions/StickyActionPanel.tsx` - Gating logic
7. `client/src/lib/balance/balanceSelector.ts` - Ensure exports
8. `client/src/components/wallet/ConnectWalletSheet.tsx` - May need small updates

### Test Files
9. `client/src/lib/balance/__tests__/balanceSelector.test.ts` - NEW

## 🚫 Do NOT Touch
- App header/navigation
- Routing
- Design system
- V3 pages

## 📊 Acceptance Criteria

- [ ] Wallet page shows correct ledger + on-chain escrow
- [ ] Connect/disconnect controls visible in balance card (not header)
- [ ] Deposit modal: auto chain-switch, wait for receipt, refresh balances
- [ ] Withdraw modal: validate amount, wait for receipt, refresh balances  
- [ ] Prediction CTA correctly gated with escrow check
- [ ] No demo balances visible
- [ ] Modals never under bottom nav
- [ ] All feature flags respected
- [ ] No layout regressions

## 🎯 Implementation Order

1. Create `useOnchainActivity` hook
2. Update `WalletPageV2` with real balances + activity
3. Fix modal behaviors (receipts, query invalidation)
4. Add prediction gating logic
5. Remove demo balances
6. Add tests
7. Verify everything works with flags ON/OFF

---

**Ready to proceed!** 🚀

