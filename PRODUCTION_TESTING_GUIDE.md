# Production Testing Guide (Without Demo Credits)

## 🎯 Overview

Since demo credits are disabled in production (`PAYMENT_DEMO_MODE=false`), you need to test features using **real crypto deposits** on Base Sepolia testnet. This guide shows you how to test all features without demo mode.

---

## 🔧 Prerequisites

1. **MetaMask or WalletConnect wallet** connected to Base Sepolia
2. **Test ETH** for gas fees (get from [Base Sepolia Faucet](https://www.coinbase.com/faucets/base-ethereum-goerli-faucet))
3. **Test USDC** for deposits (get from [Base Sepolia USDC Faucet](https://docs.circle.com/developer-docs/usdc-on-testnet) or swap ETH for USDC)

---

## 💰 Step 1: Get Test Tokens

### **Get Base Sepolia ETH:**
1. Visit [Base Sepolia Faucet](https://www.coinbase.com/faucets/base-ethereum-goerli-faucet)
2. Connect your wallet
3. Request test ETH (you'll need ~0.01 ETH for gas)

### **Get Test USDC:**
**Option A: Use Circle's USDC Faucet**
1. Visit [Circle USDC Testnet Docs](https://docs.circle.com/developer-docs/usdc-on-testnet)
2. Request test USDC to your wallet address

**Option B: Swap ETH for USDC**
1. Use [Uniswap on Base Sepolia](https://app.uniswap.org/)
2. Swap small amount of ETH for USDC

**USDC Contract Address:** `0x036CbD53842c5426634e7929541eC2318f3dCF7e`

---

## 🧪 Step 2: Test Core Features

### **✅ Feature 1: Wallet Deposit**

**Test Steps:**
1. Open app at `https://app.fanclubz.app`
2. Connect wallet (MetaMask/WalletConnect)
3. Navigate to Wallet page
4. Click "Deposit"
5. Enter amount (e.g., 10 USDC)
6. Approve transaction in wallet
7. Wait for confirmation (~15-30 seconds)

**Expected Result:**
- ✅ Balance updates in wallet
- ✅ Transaction appears in activity feed
- ✅ Deposit shows as "available" balance

**Verification:**
```bash
# Check wallet balance via API
curl https://fan-club-z.onrender.com/api/v2/wallet/summary?userId=<your_user_id>
```

---

### **✅ Feature 2: Create Prediction**

**Test Steps:**
1. Navigate to "Create Prediction"
2. Fill in prediction details:
   - Title: "Test Prediction"
   - Description: "Testing production features"
   - Options: "Yes" / "No"
   - Entry deadline: Tomorrow
   - Resolution deadline: Day after tomorrow
3. Upload image (optional)
4. Click "Create Prediction"

**Expected Result:**
- ✅ Prediction created successfully
- ✅ Appears in predictions list
- ✅ Status shows as "active"

**Verification:**
```bash
# Check prediction via API
curl https://fan-club-z.onrender.com/api/v2/predictions/<prediction_id>
```

---

### **✅ Feature 3: Place Bet (Crypto)**

**Test Steps:**
1. Open a prediction
2. Select an option (e.g., "Yes")
3. Enter stake amount (e.g., 5 USDC)
4. Click "Place Bet"
5. Approve USDC spending (if first time)
6. Confirm transaction in wallet

**Expected Result:**
- ✅ Bet placed successfully
- ✅ Balance decreases by stake amount
- ✅ Bet appears in "My Bets"
- ✅ Prediction pool increases

**Verification:**
```bash
# Check bet entry
curl https://fan-club-z.onrender.com/api/v2/predictions/<prediction_id>/entries?userId=<your_user_id>
```

---

### **✅ Feature 4: Settlement**

**Test Steps:**
1. As prediction creator, wait for resolution deadline
2. Navigate to prediction detail page
3. Click "Settle Prediction"
4. Select winning option
5. Click "Finalize Settlement"

**Expected Result:**
- ✅ Settlement processed
- ✅ Winners receive payouts
- ✅ Fees deducted correctly
- ✅ Activity feed shows "Won prediction" or "Lost prediction"

**Verification:**
```bash
# Check settlement
curl https://fan-club-z.onrender.com/api/v2/settlement/<prediction_id>
```

---

### **✅ Feature 5: Claim Winnings (On-Chain)**

**Test Steps:**
1. After settlement, if you won:
2. Navigate to Wallet page
3. Look for "Claimable" section
4. Click "Claim" button
5. Approve transaction in wallet

**Expected Result:**
- ✅ Claim transaction submitted
- ✅ Winnings transferred to wallet
- ✅ Activity feed shows "Claimed winnings"

**Verification:**
```bash
# Check claimable settlements
curl https://fan-club-z.onrender.com/api/v2/settlement/claimable?address=<your_wallet_address>
```

---

### **✅ Feature 6: Withdrawal**

**Test Steps:**
1. Navigate to Wallet page
2. Click "Withdraw"
3. Enter amount (e.g., 5 USDC)
4. Click "Withdraw"
5. Approve transaction in wallet

**Expected Result:**
- ✅ Withdrawal processed
- ✅ Balance decreases
- ✅ USDC transferred to wallet
- ✅ Activity feed shows withdrawal

---

### **✅ Feature 7: Admin Dashboard**

**Test Steps:**
1. Navigate to `https://fanclubz.app/admin`
2. Log in with admin account
3. Test admin features:
   - View users
   - View predictions
   - View settlements
   - View disputes
   - Finalize settlements

**Expected Result:**
- ✅ Admin dashboard loads
- ✅ All admin features accessible
- ✅ Actions logged in audit log

**Verification:**
```bash
# Test admin endpoint (requires X-Admin-Key header)
curl -X GET https://fan-club-z.onrender.com/api/v2/admin/users \
  -H "X-Admin-Key: <your_admin_key>"
```

---

### **✅ Feature 8: Dispute System**

**Test Steps:**
1. After a prediction is settled
2. Navigate to prediction detail page
3. Click "Dispute Settlement"
4. Select reason and add evidence
5. Submit dispute

**Expected Result:**
- ✅ Dispute created
- ✅ Shows in admin dashboard
- ✅ Admin can resolve dispute

**Verification:**
```bash
# Check disputes
curl https://fan-club-z.onrender.com/api/v2/admin/settlements/disputes?actorId=<admin_user_id> \
  -H "X-Admin-Key: <your_admin_key>"
```

---

## 🔍 Step 3: Verify Activity Feed

**Test Steps:**
1. Navigate to Profile → Activity
2. Check that all transactions appear:
   - Deposits
   - Bets placed
   - Wins/Losses
   - Fees
   - Withdrawals
   - Claims

**Expected Result:**
- ✅ All transactions visible
- ✅ Correct timestamps
- ✅ Correct amounts
- ✅ No duplicates

---

## 🐛 Step 4: Test Edge Cases

### **Test 1: Insufficient Balance**
- Try to bet more than available balance
- Expected: Error message, transaction rejected

### **Test 2: Network Switch**
- Switch from Base Sepolia to another network
- Expected: Prompt to switch back to Base Sepolia

### **Test 3: Wallet Disconnect**
- Disconnect wallet during transaction
- Expected: Graceful error handling

### **Test 4: Settlement with No Entries**
- Create prediction, don't place bets, try to settle
- Expected: Error or empty settlement

---

## 📊 Step 5: Monitor Logs

### **Render Logs:**
1. Go to Render dashboard
2. Navigate to "Logs" tab
3. Watch for:
   - Deposit confirmations
   - Settlement processing
   - Error messages

### **Check Database:**
```sql
-- Check wallet balance
SELECT available_balance, total_deposited 
FROM wallets 
WHERE user_id = '<your_user_id>';

-- Check recent transactions
SELECT * FROM wallet_transactions 
WHERE user_id = '<your_user_id>' 
ORDER BY created_at DESC 
LIMIT 10;

-- Check predictions
SELECT id, title, status, pool_total 
FROM predictions 
ORDER BY created_at DESC 
LIMIT 10;
```

---

## ✅ Testing Checklist

- [ ] Wallet deposit works
- [ ] Balance shows correctly
- [ ] Can create predictions
- [ ] Can place bets (crypto)
- [ ] Settlement works correctly
- [ ] Fees calculated correctly
- [ ] Winners can claim
- [ ] Activity feed shows all transactions
- [ ] Withdrawal works
- [ ] Admin dashboard accessible
- [ ] Admin can finalize settlements
- [ ] Dispute system works
- [ ] No duplicate transactions
- [ ] Error handling works

---

## 🚨 Common Issues & Solutions

### **Issue: Balance shows 0 after deposit**
**Solution:**
- Check deposit transaction on [Basescan](https://sepolia.basescan.org/)
- Verify wallet address matches
- Check server logs for deposit watcher errors
- Run wallet reconciliation: `POST /api/v2/wallet/reconcile`

### **Issue: Bet transaction fails**
**Solution:**
- Ensure sufficient ETH for gas
- Check USDC approval (may need to approve first)
- Verify prediction is still active
- Check RPC connection

### **Issue: Settlement fails**
**Solution:**
- Verify prediction has entries
- Check winning option is set
- Ensure relayer has ETH for gas
- Check admin API key is set

### **Issue: Claim not showing**
**Solution:**
- Verify settlement is `onchain_finalized`
- Check you have crypto entries (not demo)
- Verify Merkle root is posted
- Check wallet address matches

---

## 📝 Notes

- **Base Sepolia is a testnet** - tokens have no real value
- **Transactions may take 15-30 seconds** to confirm
- **Gas fees are paid in ETH**, not USDC
- **Keep relayer wallet funded** for admin finalization
- **Monitor logs** for any errors during testing

---

## 🔗 Useful Links

- [Base Sepolia Explorer](https://sepolia.basescan.org/)
- [Base Sepolia Faucet](https://www.coinbase.com/faucets/base-ethereum-goerli-faucet)
- [Circle USDC Testnet](https://docs.circle.com/developer-docs/usdc-on-testnet)
- [Uniswap Base Sepolia](https://app.uniswap.org/)

