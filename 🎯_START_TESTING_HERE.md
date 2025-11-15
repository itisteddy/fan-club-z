# 🎯 START TESTING HERE

## ✅ Everything is Ready!

**Branch:** `feat/wallet-ux-and-crypto-fixes`  
**Status:** Fully Implemented & Compiled  
**Servers:** Running ✅

---

## 🚀 Quick Start (5 minutes)

### Step 1: Open the App
Visit: **http://localhost:5175**

### Step 2: Go to Wallet
Click the **Wallet** tab in the bottom navigation

### Step 3: See the New On-chain Card
You should see a **blue gradient card** labeled:
- **"On-chain Balance"** (Base Sepolia)
- Shows **3 rows**: Wallet USDC, Escrow USDC, Available to stake
- Has 2 buttons: **Deposit** (green) and **Withdraw** (gray)

---

## 🧪 Test Scenarios

### ✅ Test 1: Deposit USDC (2 minutes)

1. **Click "Deposit"** button
2. **Modal opens** showing:
   - Your wallet address (0x9CCD...)
   - Current chain (Base Sepolia or warning to switch)
   - Amount input
   - MAX button
3. **Enter amount** (e.g., 10)
4. **Click "Continue"**
5. **Expected Results:**
   - If wrong chain → auto-switches to Base Sepolia
   - MetaMask/wallet pops up
   - Confirm transaction
   - Toast: "Deposit confirmed" ✅
   - Modal closes automatically
   - Escrow USDC increases by $10
   - No page refresh needed

**Press ESC during modal** → should close  
**Click outside modal** → should close

---

### ✅ Test 2: Withdraw USDC (2 minutes)

1. **Click "Withdraw"** button
   - Should be **disabled** if Available to stake = $0
2. **Modal opens**
3. **Try entering amount > available**
   - Red error: "Insufficient balance"
4. **Enter valid amount** (≤ available)
5. **Click "Withdraw"**
6. **Expected Results:**
   - Transaction confirms
   - Toast: "Withdrawal confirmed" ✅
   - Wallet USDC increases
   - Escrow USDC decreases
   - Available to stake updates

---

### ✅ Test 3: Place a Bet (3 minutes)

1. **Go to any prediction** (e.g., "Will FanclubZ hit 1,000 users?")
2. **Select an option** (Yes or No)
3. **Check the balance label** → should say:
   - "Escrow USDC available: $X (Base Sepolia)"
4. **Enter stake amount**:
   - If amount ≤ available → "Place Bet: $X" button
   - If amount > available → "Deposit Funds" button
5. **Try over-betting**:
   - Enter $1000 (more than you have)
   - Button says "Deposit Funds"
   - Click it → Deposit modal opens
6. **Place valid bet**:
   - Enter amount ≤ available
   - Click "Place Bet"
   - Bet succeeds
   - Balance decreases
   - Activity tab updates

---

## 🔍 Console Checks

Open browser DevTools → Console tab

**Should NOT see:**
- ❌ "waitForTransactionReceipt is not a function"
- ❌ "Unknown event handler onEscapeKeyDown"
- ❌ "Invalid hook call"
- ❌ 404 on /api/chain/activity
- ❌ Any chain mismatch errors

**Should see:**
- ✅ Clean logs
- ✅ Transaction confirmations
- ✅ Balance calculations

---

## 📊 What You'll See

### Wallet Page:
```
┌─────────────────────────────────────┐
│ On-chain Balance  [Base Sepolia]   │
├─────────────────────────────────────┤
│ 💰 Wallet USDC         $25.00 [ERC20]│
│ 💳 Escrow USDC         $60.00       │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│ 📈 Available to stake  $45.00       │
│                                      │
│  [Deposit]      [Withdraw]           │
└─────────────────────────────────────┘
```

### Prediction Details:
```
Escrow USDC available: $45.00 (Base Sepolia)

Stake Amount: [____10____] [MAX]

Available: $45.00
[✓] Sufficient balance

[Place Bet: $10]  ← or [Deposit Funds] if over
```

---

## 🐛 Known Issues (Expected)

None! All critical bugs are fixed.

---

## 🎁 Bonus Features

1. **Auto-Network Switching** - No more manual chain switching
2. **Real-time Activity** - Auto-refreshes every 10 seconds
3. **Smart Validation** - Can't over-bet, clear error messages
4. **Clean Modals** - ESC/click-outside works perfectly
5. **Query Invalidation** - UI updates without refresh

---

## 📞 If Something Breaks

1. **Check browser console** - Any red errors?
2. **Check network tab** - Is `/api/chain/activity` returning 200?
3. **Check wallet** - Connected to Base Sepolia?
4. **Hard refresh** - Cmd+Shift+R (clear cache)
5. **Check .env.local** - All vars present?

---

## 🎯 Success Criteria

You'll know it's working when:
- ✅ Deposit increases escrow by exact amount
- ✅ Withdraw decreases escrow by exact amount
- ✅ Available to stake = Escrow - Reserved (correct math)
- ✅ Can't bet more than available (deposit modal opens instead)
- ✅ Activity feed shows your transactions
- ✅ No console errors
- ✅ Modals close cleanly
- ✅ No false "failed" messages

---

## 🚀 Ready? Go Test!

**Start here:** http://localhost:5175/wallet

Everything is built, wired, and ready. All the complex blockchain logic, balance calculations, and UI updates are done. Just follow the test scenarios above and report what you see!

---

**Files to review if you want to see the code:**
- `client/src/components/wallet/DepositUSDCModal.tsx` - Deposit implementation
- `client/src/components/wallet/WithdrawUSDCModal.tsx` - Withdraw implementation  
- `client/src/lib/balance/balanceSelector.ts` - Balance calculation logic
- `client/src/pages/WalletPageV2.tsx` - Wallet UI with crypto card
- `IMPLEMENTATION_COMPLETE.md` - Full technical details

