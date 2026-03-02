# Quick Start - No Deployment Needed! 🚀

## You're Already 95% Done!

✅ Mock testing works  
✅ Database ready  
✅ Server code ready  

**You don't need to deploy a contract!** Just use the existing Base Sepolia USDC.

## Step 1: Insert USDC Address (30 seconds)

Run this in your Supabase SQL Editor:

```sql
INSERT INTO chain_addresses (env, chain_id, kind, address)
VALUES ('qa', 84532, 'usdc', '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA')
ON CONFLICT (env, chain_id, kind) DO UPDATE SET address=EXCLUDED.address;
```

✅ **Done!** You just inserted it.

## Step 2: Create a Test User Deposit Address (1 minute)

```sql
-- Get a user ID
SELECT id, email FROM users LIMIT 1;

-- Insert a deposit address for them (use your MetaMask address)
INSERT INTO crypto_addresses (user_id, chain_id, address)
VALUES (
  'PASTE_USER_ID_HERE',
  84532,
  'PASTE_YOUR_METAMASK_ADDRESS_HERE'
)
ON CONFLICT (chain_id, address) DO NOTHING;
```

## Step 3: Start Server for Real Chain (30 seconds)

Stop the mock server and start with real chain:

```bash
cd server

# Stop mock server
pkill -f "tsx src/index.ts"

# Start with real chain config
PAYMENTS_ENABLE=1 \
RUNTIME_ENV=qa \
CHAIN_ID=84532 \
RPC_URL=https://sepolia.base.org \
RPC_WS_URL=wss://sepolia.base.org \
ENABLE_BASE_DEPOSITS=1 \
BASE_DEPOSITS_MOCK=0 \
npm run dev
```

Watch for these logs:
```
[FCZ-PAY] Resolving addresses for env=qa, chain=84532
[FCZ-PAY] Validating USDC address: 0xd9aA...
[FCZ-PAY] ✅ USDC address validated
[FCZ-PAY] Base USDC watcher started
```

## Step 4: Get Test USDC (2 minutes)

### Option A: Bridge from Ethereum Sepolia
1. Get Sepolia ETH from faucet
2. Use Base bridge: https://bridge.base.org/

### Option B: Use a Faucet (if available)
Check Base Discord or community for USDC faucets

### Option C: Ask in Base Discord
Join: https://discord.gg/buildonbase
Ask in #faucet channel

## Step 5: Send Test Deposit (30 seconds)

1. Open MetaMask
2. Switch to **Base Sepolia** network
3. Send 1-2 USDC to the deposit address (from Step 2)
4. Watch server logs for detection!

Expected logs:
```
[FCZ-PAY] Transfer detected: 1.5 USDC
[FCZ-PAY] Deposit credited to user xxx
```

## Step 6: Verify (30 seconds)

```sql
-- Check transaction
SELECT * FROM wallet_transactions 
WHERE channel = 'crypto' 
AND provider = 'base-usdc'
ORDER BY created_at DESC;

-- Check balance
SELECT user_id, available_balance, total_deposited
FROM wallets
WHERE user_id = 'YOUR_USER_ID';
```

## That's It! 🎉

Total time: ~5 minutes

No deployment needed!  
No private keys needed!  
No Hardhat issues!  

---

## If You Want to Deploy Your Own Later

See `SMART_CONTRACT_DEPLOYMENT.md` for full instructions.

But for testing, the existing USDC works perfectly!
