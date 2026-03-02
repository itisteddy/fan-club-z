# Smart Contract Deployment Guide

## ✅ Mock Testing Complete!

Your mock deposit test was successful:
- User: `11dcc0d3-d6ee-42eb-94d7-919256ebb684`
- Amount: $12.50
- Status: ✅ Credited

## Smart Contract Setup

I've created everything you need to deploy a test USDC contract on Base Sepolia.

### Files Created:
```
contracts/
├── TestUSDC.sol                    # Simple ERC20 token (6 decimals like USDC)
├── hardhat.config.js               # Hardhat configuration
├── package.json                    # Dependencies
└── scripts/
    └── deploy-testusdc.js          # Deployment script
```

## Option 1: Use Existing Base Sepolia USDC (Easiest)

**Skip deployment and use the official Base Sepolia USDbC:**

Address: `0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA`

Insert into your database:
```sql
INSERT INTO chain_addresses (env, chain_id, kind, address)
VALUES ('qa', 84532, 'usdc', '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA')
ON CONFLICT (env, chain_id, kind) DO UPDATE SET address=EXCLUDED.address;
```

Then:
1. Get Base Sepolia ETH from faucet
2. Bridge or get test USDC
3. Send to user deposit addresses

## Option 2: Deploy Your Own Test USDC (Full Control)

### Step 1: Install Dependencies

```bash
cd contracts
npm install
```

### Step 2: Get Base Sepolia ETH

Visit: https://www.coinbase.com/faucets/base-ethereum-goerli-faucet

Or use other Base Sepolia faucets.

### Step 3: Configure Environment

Create `contracts/.env`:
```bash
BASE_SEPOLIA_RPC=https://sepolia.base.org
DEPLOYER_PRIVATE_KEY=your_private_key_here
```

**⚠️ NEVER commit your private key!**

### Step 4: Deploy Contract

```bash
cd contracts
npm run deploy:testusdc
```

Expected output:
```
🚀 Deploying TestUSDC to Base Sepolia...
📝 Deploying with account: 0x...
💰 Account balance: 0.1 ETH
✅ TestUSDC deployed to: 0x...
📊 Initial supply: 1000000 USDC

📝 Deployment info saved to deployment-info.json
🔍 Verify on BaseScan: https://sepolia.basescan.org/address/0x...
```

### Step 5: Insert Address into Database

The deployment script will output the SQL command. Run it in Supabase:

```sql
INSERT INTO chain_addresses (env, chain_id, kind, address)
VALUES ('qa', 84532, 'usdc', '0xYourDeployedAddress')
ON CONFLICT (env, chain_id, kind) DO UPDATE SET address=EXCLUDED.address;
```

### Step 6: Mint Test Tokens

Your TestUSDC contract has a `faucet()` function that anyone can call to get 100 USDC.

**Using Remix:**
1. Go to https://remix.ethereum.org
2. Connect to Base Sepolia network
3. Load your contract at the deployed address
4. Call `faucet()` to get 100 USDC

**Using Hardhat Console:**
```bash
npx hardhat console --network baseSepolia

const TestUSDC = await ethers.getContractFactory("TestUSDC");
const usdc = TestUSDC.attach("YOUR_DEPLOYED_ADDRESS");

// Mint to yourself
await usdc.faucet();

// Or mint to specific address (owner only)
await usdc.mint("0xUserAddress", ethers.parseUnits("1000", 6)); // 1000 USDC
```

## Testing Real Deposits

### Step 1: Create User Deposit Address

In Supabase:
```sql
-- Use a user from your database
SELECT id, email FROM users LIMIT 1;

-- Insert their deposit address (use your MetaMask or create new wallet)
INSERT INTO crypto_addresses (user_id, chain_id, address)
VALUES (
  'USER_ID_FROM_ABOVE',
  84532,
  '0xYourDepositWalletAddress'
)
ON CONFLICT (chain_id, address) DO NOTHING;
```

### Step 2: Configure Server for Real Chain

Stop the mock server and start with real chain config:

```bash
cd server

# Create .env.local with:
PAYMENTS_ENABLE=1
RUNTIME_ENV=qa
CHAIN_ID=84532
RPC_URL=https://sepolia.base.org
RPC_WS_URL=wss://sepolia.base.org
ENABLE_BASE_DEPOSITS=1
BASE_DEPOSITS_MOCK=0

# Start server
npm run dev
```

Watch for:
```
[FCZ-PAY] Resolving addresses for env=qa, chain=84532
[FCZ-PAY] Validating USDC address: 0x...
[FCZ-PAY] ✅ USDC address validated
[FCZ-PAY] Base USDC watcher started
```

### Step 3: Send Test Deposit

Using MetaMask or your wallet:
1. Connect to Base Sepolia
2. Send 1-2 USDC to the deposit address
3. Watch server logs for detection

Expected logs:
```
[FCZ-PAY] Transfer detected: 1.5 USDC to 0x...
[FCZ-PAY] Deposit credited to user xxx
```

### Step 4: Verify in Database

```sql
-- Check transaction
SELECT * FROM wallet_transactions 
WHERE channel = 'crypto' AND provider = 'base-usdc'
ORDER BY created_at DESC;

-- Check balance
SELECT user_id, available_balance, total_deposited
FROM wallets
WHERE user_id = 'YOUR_USER_ID';
```

### Step 5: Test Idempotency

Restart server - balance should NOT double!

## Troubleshooting

### "No ETH balance"
Get Base Sepolia ETH from faucet first

### "USDC address has no bytecode"
- Verify contract deployed successfully
- Check you're on correct network (84532)
- Confirm address in BaseScan

### Deposits not detected
- Check watcher started in logs
- Verify deposit address in `crypto_addresses`
- Check transaction on BaseScan
- Verify RPC connectivity

## Production Deployment

For production (Base Mainnet):

1. Use official USDC: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
2. Insert into database:
```sql
INSERT INTO chain_addresses (env, chain_id, kind, address)
VALUES ('prod', 8453, 'usdc', '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913')
ON CONFLICT (env, chain_id, kind) DO UPDATE SET address=EXCLUDED.address;
```

3. Update environment:
```bash
RUNTIME_ENV=prod
CHAIN_ID=8453
RPC_URL=https://mainnet.base.org
```

## Summary

✅ Mock testing works  
📝 Smart contracts ready to deploy  
🔧 Deployment scripts created  
📚 Full documentation provided  

**Recommended Next Step:**
Use Option 1 (existing Base Sepolia USDC) for fastest testing, or deploy your own if you want full control.
