# ✅ Complete Setup Steps - Where You Are Now

## What's Done ✅

1. ✅ **TestUSDC Contract Deployed**
   - Address: `0x5B966ca41aB58E50056EE1711c9766Ca3382F115`
   - Network: Base Sepolia
   - Balance: 1,000,000 USDC

2. ✅ **Database Setup Complete**
   - `chain_addresses` table has the USDC contract address
   - `crypto_addresses` table has your deposit address: `0x9CCD0C785E5E7737e39EB9625D7Fc181608cBa9c`
   - User ID: `00000000-0000-0000-0000-000000000000`

3. ✅ **Scripts Created**
   - ✅ `contracts/scripts/check-balance.js` - Check USDC balance
   - ✅ `contracts/scripts/send-test-deposit.js` - Send test deposit
   - ✅ `start-deposit-watcher.sh` - Start server with watcher

---

## What You Need To Do Now 🎯

### Step 1: Configure Server Environment

Open `server/.env` and add/update these variables:

```bash
# Payment System
PAYMENTS_ENABLE=1
ENABLE_BASE_DEPOSITS=1
BASE_DEPOSITS_MOCK=0

# Base Sepolia Configuration
CHAIN_ID=84532
RPC_URL=https://sepolia.base.org
RPC_WS_URL=wss://base-sepolia-rpc.publicnode.com

# Contract Address (your deployed TestUSDC)
USDC_ADDRESS=0x5B966ca41aB58E50056EE1711c9766Ca3382F115

# Runtime Environment
RUNTIME_ENV=qa

# Supabase (keep your existing values)
SUPABASE_URL=<your_existing_value>
SUPABASE_ANON_KEY=<your_existing_value>
```

### Step 2: Start the Server with Deposit Watcher

```bash
cd server
npx tsx src/index.ts
```

**Look for these log messages:**
```
[FCZ-PAY] ✅ Deposit watcher started successfully
[FCZ-PAY] Base USDC watcher started (watchEvent).
```

If you see these, the watcher is running! 🎉

### Step 3: Send a Test Deposit

**Open a NEW terminal** (keep the server running) and run:

```bash
cd contracts
npx hardhat run scripts/send-test-deposit.js --network baseSepolia
```

This will:
- Send 10 USDC to your deposit address
- Show you the transaction hash
- Give you a BaseScan link to view the transaction

### Step 4: Verify Detection

**Check your server logs** (the terminal where the server is running).

You should see something like:
```
[FCZ-PAY] processing transfer logs...
[FCZ-PAY] credited user 00000000-0000-0000-0000-000000000000 with 10 USDC
```

### Step 5: Verify Database

In Supabase SQL Editor, run:

```sql
-- Check wallet balance
SELECT * FROM wallets 
WHERE user_id = '00000000-0000-0000-0000-000000000000';

-- Check transaction record
SELECT * FROM wallet_transactions 
WHERE user_id = '00000000-0000-0000-0000-000000000000'
ORDER BY created_at DESC 
LIMIT 5;

-- Check event log
SELECT * FROM event_log 
WHERE source = 'base-watcher'
ORDER BY ts DESC 
LIMIT 5;
```

You should see:
- `wallets.available_balance` increased by 10
- A new row in `wallet_transactions` with `type='deposit'`, `channel='crypto'`, `provider='base-usdc'`
- An entry in `event_log`

---

## Troubleshooting 🔧

### Server won't start
- Check that all environment variables are set in `server/.env`
- Run: `cat server/.env | grep -E "(PAYMENTS_ENABLE|CHAIN_ID|USDC_ADDRESS)"`

### Watcher not detecting deposits
- Verify the server logs show "Deposit watcher started successfully"
- Check that `crypto_addresses` has your deposit address
- Verify the transaction succeeded on BaseScan
- Wait 10-30 seconds (blockchain indexing delay)

### Transaction fails
- Check your ETH balance for gas: `npx hardhat run scripts/check-balance.js --network baseSepolia`
- Verify you have USDC: Should show 1,000,000 USDC
- Check network: Should be Base Sepolia (chain ID 84532)

---

## Quick Reference Commands 📝

```bash
# Start server with watcher
cd server && npx tsx src/index.ts

# Check USDC balance
cd contracts && npx hardhat run scripts/check-balance.js --network baseSepolia

# Send test deposit
cd contracts && npx hardhat run scripts/send-test-deposit.js --network baseSepolia

# View transaction on BaseScan
# https://sepolia.basescan.org/tx/YOUR_TX_HASH
```

---

## Success Criteria ✅

You'll know it's working when:
1. ✅ Server starts without errors
2. ✅ Logs show "Deposit watcher started successfully"
3. ✅ Test deposit transaction succeeds
4. ✅ Server logs show deposit detection
5. ✅ Database shows updated balance
6. ✅ `wallet_transactions` has the deposit record

---

**You're almost there!** Just configure the server environment and run the commands above. 🚀

