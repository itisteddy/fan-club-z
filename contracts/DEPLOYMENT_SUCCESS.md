# 🎉 TestUSDC Successfully Deployed!

## Deployment Details

**Contract Address:** `0x5B966ca41aB58E50056EE1711c9766Ca3382F115`  
**Network:** Base Sepolia (Chain ID: 84532)  
**Deployer:** `0x9CCD0C785E5E7737e39EB9625D7Fc181608cBa9c`  
**BaseScan:** https://sepolia.basescan.org/address/0x5B966ca41aB58E50056EE1711c9766Ca3382F115

## Next Steps

### Step 1: Insert Address into Database

Run this in your Supabase SQL Editor:

```sql
INSERT INTO chain_addresses (env, chain_id, kind, address)
VALUES ('qa', 84532, 'usdc', '0x5B966ca41aB58E50056EE1711c9766Ca3382F115')
ON CONFLICT (env, chain_id, kind) DO UPDATE SET address=EXCLUDED.address;
```

✅ **You already did this!**

### Step 2: Mint Test Tokens

Your contract has a `faucet()` function that gives you 100 USDC.

**Using Remix:**
1. Go to https://remix.ethereum.org
2. Connect to Base Sepolia
3. Load contract at `0x5B966ca41aB58E50056EE1711c9766Ca3382F115`
4. Call `faucet()` to get 100 USDC

**Or use Hardhat console:**
```bash
npx hardhat console --network baseSepolia

const TestUSDC = await ethers.getContractFactory("TestUSDC");
const usdc = TestUSDC.attach("0x5B966ca41aB58E50056EE1711c9766Ca3382F115");

// Get 100 USDC
await usdc.faucet();

// Check balance
const balance = await usdc.balanceOf("0x9CCD0C785E5E7737e39EB9625D7Fc181608cBa9c");
console.log("Balance:", ethers.formatUnits(balance, 6), "USDC");
```

### Step 3: Create Test User Deposit Address

In Supabase:
```sql
-- Get a user
SELECT id, email FROM users LIMIT 1;

-- Insert deposit address
INSERT INTO crypto_addresses (user_id, chain_id, address)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  84532,
  '0x9CCD0C785E5E7737e39EB9625D7Fc181608cBa9c'  -- Use your MetaMask address
)
ON CONFLICT (chain_id, address) DO NOTHING;
```

### Step 4: Start Server for Real Chain

```bash
cd ../server

# Stop mock server
pkill -f "tsx src/index.ts"

# Start with real chain
PAYMENTS_ENABLE=1 \
RUNTIME_ENV=qa \
CHAIN_ID=84532 \
RPC_URL=https://sepolia.base.org \
RPC_WS_URL=wss://sepolia.base.org \
ENABLE_BASE_DEPOSITS=1 \
BASE_DEPOSITS_MOCK=0 \
npm run dev
```

Watch for:
```
[FCZ-PAY] Resolving addresses for env=qa, chain=84532
[FCZ-PAY] Validating USDC address: 0x5B966...
[FCZ-PAY] ✅ USDC address validated
[FCZ-PAY] Base USDC watcher started
```

### Step 5: Test Deposit

1. Get 100 USDC using `faucet()`
2. Send 1-2 USDC to the deposit address
3. Watch server logs for detection!

Expected logs:
```
[FCZ-PAY] Transfer detected: 1.5 USDC
[FCZ-PAY] Deposit credited to user xxx
```

### Step 6: Verify

```sql
SELECT * FROM wallet_transactions 
WHERE channel = 'crypto' 
ORDER BY created_at DESC;

SELECT user_id, available_balance, total_deposited
FROM wallets;
```

## Contract Functions

- `faucet()` - Get 100 USDC (anyone can call)
- `mint(address to, uint256 amount)` - Mint any amount (owner only)
- `balanceOf(address)` - Check balance
- `transfer(address to, uint256 amount)` - Send USDC

## Summary

✅ Contract deployed  
✅ Address ready to insert  
✅ Ready to mint tokens  
✅ Ready to test deposits  

**You're all set!** 🚀

---

## 📚 Next Steps & Complete Documentation

All the complex work is done! Now you just need to configure the server and test.

### 🎯 Primary Guide
**Start here:** [`FINAL_SETUP_INSTRUCTIONS.md`](../FINAL_SETUP_INSTRUCTIONS.md)

This guide contains:
- ✅ Exact environment variables to add
- ✅ Step-by-step commands
- ✅ Troubleshooting for all scenarios
- ✅ Success criteria checklist

### ⚡ Quick References
- **[QUICK_START.md](../QUICK_START.md)** - Just the commands
- **[DEPLOYMENT_STATUS.md](../DEPLOYMENT_STATUS.md)** - What's complete vs. what's next
- **[CHECKLIST.md](../CHECKLIST.md)** - Interactive progress tracker
- **[WHAT_I_DID_FOR_YOU.md](../WHAT_I_DID_FOR_YOU.md)** - Summary of completed work

### 🛠️ Helper Scripts Created
```bash
# Verify your server environment is configured
./verify-server-env.sh

# Check your USDC balance
cd contracts && npx hardhat run scripts/check-balance.js --network baseSepolia

# Send a test deposit
cd contracts && npx hardhat run scripts/send-test-deposit.js --network baseSepolia
```

### 🎉 What's Next (5 Minutes)

1. **Add environment variables** to `server/.env` (see FINAL_SETUP_INSTRUCTIONS.md)
2. **Start the server:** `cd server && npx tsx src/index.ts`
3. **Send test deposit:** `cd contracts && npx hardhat run scripts/send-test-deposit.js --network baseSepolia`
4. **Verify it worked** in server logs and database

That's it! Your crypto deposit system will be fully operational. 🚀
