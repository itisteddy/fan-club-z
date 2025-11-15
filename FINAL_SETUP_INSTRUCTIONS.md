# 🎯 FINAL SETUP INSTRUCTIONS

## Current Status

✅ **Completed:**
1. TestUSDC contract deployed to Base Sepolia
2. Contract address: `0x5B966ca41aB58E50056EE1711c9766Ca3382F115`
3. Database tables updated (`chain_addresses`, `crypto_addresses`)
4. You have 1,000,000 test USDC
5. All helper scripts created

❌ **Needs Your Action:**
- Configure `server/.env` with payment system variables

---

## 🔧 Step 1: Configure Server Environment

Open `server/.env` in your editor and **ADD** these lines:

```bash
# Payment System Configuration
PAYMENTS_ENABLE=1
ENABLE_BASE_DEPOSITS=1
BASE_DEPOSITS_MOCK=0

# Base Sepolia Chain
CHAIN_ID=84532
RPC_URL=https://sepolia.base.org
RPC_WS_URL=wss://base-sepolia-rpc.publicnode.com

# Your Deployed Contract
USDC_ADDRESS=0x5B966ca41aB58E50056EE1711c9766Ca3382F115

# Environment
RUNTIME_ENV=qa
```

**Important:** Keep your existing `SUPABASE_URL` and `SUPABASE_ANON_KEY` values!

---

## ✅ Step 2: Verify Environment

Run this command to check your configuration:

```bash
./verify-server-env.sh
```

You should see all green checkmarks ✅

---

## 🚀 Step 3: Start the Server

```bash
cd server
npx tsx src/index.ts
```

**Look for these success messages:**
```
[FCZ-PAY] ✅ Deposit watcher started successfully
[FCZ-PAY] Base USDC watcher started (watchEvent).
```

**Leave this terminal open!** The server needs to keep running to detect deposits.

---

## 💸 Step 4: Send Test Deposit

**Open a NEW terminal** and run:

```bash
cd contracts
npx hardhat run scripts/send-test-deposit.js --network baseSepolia
```

This sends 10 USDC to your test user's deposit address.

---

## 👀 Step 5: Watch the Magic Happen

**In your server terminal**, you should see:
```
[FCZ-PAY] Processing transfer logs...
[FCZ-PAY] Credited user 00000000-0000-0000-0000-000000000000 with 10 USDC
```

---

## 🔍 Step 6: Verify in Database

Go to your Supabase SQL Editor and run:

```sql
-- Check wallet balance (should show 10 USDC)
SELECT available_balance, total_deposited 
FROM wallets 
WHERE user_id = '00000000-0000-0000-0000-000000000000';

-- Check transaction record
SELECT type, channel, provider, amount, status, external_ref, created_at
FROM wallet_transactions 
WHERE user_id = '00000000-0000-0000-0000-000000000000'
ORDER BY created_at DESC 
LIMIT 1;

-- Check event log
SELECT source, kind, ref, payload, ts
FROM event_log 
WHERE source = 'base-watcher'
ORDER BY ts DESC 
LIMIT 1;
```

**Expected Results:**
- `wallets.available_balance` = 10
- `wallet_transactions` has a row with `type='deposit'`, `channel='crypto'`
- `event_log` has a `base-watcher` entry

---

## 🎉 Success Criteria

You know it's working when:
1. ✅ Server starts without errors
2. ✅ Logs show "Deposit watcher started successfully"
3. ✅ Test deposit transaction succeeds (you get a BaseScan link)
4. ✅ Server logs show deposit was credited
5. ✅ Database shows 10 USDC balance
6. ✅ Transaction record exists in `wallet_transactions`

---

## 🐛 Troubleshooting

### "Missing required environment variables"
- Double-check you added ALL the variables to `server/.env`
- Run `./verify-server-env.sh` to see which ones are missing

### "Watcher not started"
- Check `PAYMENTS_ENABLE=1` and `ENABLE_BASE_DEPOSITS=1`
- Verify `USDC_ADDRESS` matches your deployed contract
- Check `RUNTIME_ENV=qa` (must match `chain_addresses.env` column)

### "Deposit not detected"
- Verify transaction succeeded on BaseScan
- Check `crypto_addresses` table has the deposit address
- Wait 10-30 seconds (blockchain indexing delay)
- Look for errors in server logs

### "Already have enough tokens"
- This is normal! You already minted USDC during deployment
- Skip to step 4 (send test deposit)

---

## 📚 Helper Commands

```bash
# Verify environment setup
./verify-server-env.sh

# Check USDC balance
cd contracts && npx hardhat run scripts/check-balance.js --network baseSepolia

# Start server
cd server && npx tsx src/index.ts

# Send test deposit (in new terminal)
cd contracts && npx hardhat run scripts/send-test-deposit.js --network baseSepolia
```

---

## 📞 Need Help?

If something doesn't work:
1. Check the server logs for error messages
2. Verify all environment variables are set correctly
3. Confirm the transaction succeeded on BaseScan
4. Check the database tables directly in Supabase

---

**You're one configuration file away from a fully working crypto deposit system!** 🚀

Just add those environment variables to `server/.env` and run the commands above.

