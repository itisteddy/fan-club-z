# Testing Guide - P1 Crypto Deposits

## Quick Start: Mock Testing (No Blockchain Required)

### Step 1: Get a Test User ID

Run in Supabase SQL Editor:
```sql
SELECT id, email FROM users ORDER BY created_at DESC LIMIT 5;
```

Copy one of the user IDs (format: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`)

### Step 2: Start Server in Mock Mode

```bash
cd server
BASE_DEPOSITS_MOCK=1 npm run dev
```

### Step 3: Test Mock Deposit

Replace `YOUR_USER_ID` with the actual user ID:

```bash
curl -X POST http://localhost:3001/api/qa/crypto/mock-deposit \
  -H "Content-Type: application/json" \
  -d '{"user_id":"YOUR_USER_ID","amount":12.5}'
```

**Expected Response:**
```json
{"ok":true,"credited":true}
```

### Step 4: Verify in Database

```sql
-- Check wallet balance
SELECT user_id, available_balance, total_deposited 
FROM wallets 
WHERE user_id = 'YOUR_USER_ID';

-- Check transaction
SELECT * FROM wallet_transactions 
WHERE user_id = 'YOUR_USER_ID' 
AND provider = 'base-usdc'
ORDER BY created_at DESC;

-- Check event log
SELECT * FROM event_log 
WHERE kind = 'mock-deposit'
ORDER BY ts DESC LIMIT 5;
```

### Step 5: Test Idempotency

Run the same curl command again within 30 seconds:

```bash
curl -X POST http://localhost:3001/api/qa/crypto/mock-deposit \
  -H "Content-Type: application/json" \
  -d '{"user_id":"YOUR_USER_ID","amount":12.5}'
```

**Expected Response:**
```json
{"ok":true,"credited":false}
```

Balance should NOT increase (idempotency working!)

---

## Option 2: Real Blockchain Testing (Base Sepolia)

### Prerequisites

You need:
1. Base Sepolia testnet USDC contract address
2. Your deployed escrow contract address (optional)
3. Base Sepolia RPC URL
4. Test user with a deposit address

### Step 1: Get Contract Addresses

#### Base Sepolia USDC (Official Test Token)

**Option A: Use Base Sepolia USDbC (Bridged USDC)**
- Address: `0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA`
- This is the official bridged USDC on Base Sepolia

**Option B: Deploy Your Own Test ERC20**

If you want full control, deploy a simple ERC20:

```solidity
// SimpleUSDC.sol
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract SimpleUSDC is ERC20 {
    constructor() ERC20("Test USDC", "USDC") {
        _mint(msg.sender, 1000000 * 10**6); // 1M USDC (6 decimals)
    }
    
    function decimals() public pure override returns (uint8) {
        return 6;
    }
    
    function mint(address to, uint256 amount) public {
        _mint(to, amount);
    }
}
```

Deploy using Remix or Hardhat to Base Sepolia.

### Step 2: Insert Addresses into Database

```sql
-- Insert Base Sepolia USDC address
INSERT INTO chain_addresses (env, chain_id, kind, address)
VALUES ('qa', 84532, 'usdc', '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA')
ON CONFLICT (env, chain_id, kind) DO UPDATE SET address=EXCLUDED.address;

-- If you have an escrow contract (optional for now)
INSERT INTO chain_addresses (env, chain_id, kind, address)
VALUES ('qa', 84532, 'escrow', '0xYourEscrowAddress')
ON CONFLICT (env, chain_id, kind) DO UPDATE SET address=EXCLUDED.address;
```

### Step 3: Set Up Test User Deposit Address

```sql
-- Get a test user
SELECT id, email FROM users LIMIT 1;

-- Create a deposit address for them
-- Use your MetaMask address or create a new wallet
INSERT INTO crypto_addresses (user_id, chain_id, address)
VALUES (
  'YOUR_USER_ID',
  84532,
  '0xYourDepositWalletAddress'
)
ON CONFLICT (chain_id, address) DO NOTHING;
```

### Step 4: Configure Environment

Create `server/.env.local`:

```bash
# Master Flags
PAYMENTS_ENABLE=1
RUNTIME_ENV=qa

# Base Sepolia
CHAIN_ID=84532
RPC_URL=https://sepolia.base.org
RPC_WS_URL=wss://sepolia.base.org
ENABLE_BASE_DEPOSITS=1
BASE_DEPOSITS_MOCK=0

# Supabase (your existing config)
VITE_SUPABASE_URL=your_url
VITE_SUPABASE_ANON_KEY=your_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key
```

### Step 5: Start Server

```bash
cd server
npm run dev
```

Watch for these logs:
```
[FCZ-PAY] Resolving addresses for env=qa, chain=84532
[FCZ-PAY] Validating USDC address: 0xd9aA...
[FCZ-PAY] ✅ USDC address validated
[FCZ-PAY] Base USDC watcher started (watchEvent).
```

### Step 6: Get Test USDC

#### Option A: Use Faucet (if available)
Check Base Sepolia faucets or bridges

#### Option B: Mint from Your Contract
If you deployed your own test token:

```javascript
// Using ethers.js or web3.js
const usdc = new ethers.Contract(usdcAddress, usdcAbi, signer);
await usdc.mint(yourAddress, ethers.utils.parseUnits("100", 6)); // 100 USDC
```

#### Option C: Use Remix
1. Go to Remix IDE
2. Load your USDC contract
3. Call `mint(yourAddress, 100000000)` // 100 USDC with 6 decimals

### Step 7: Send Test Deposit

Using MetaMask or your wallet:
1. Connect to Base Sepolia network
2. Send 1-2 USDC to the deposit address (from crypto_addresses table)
3. Watch server logs for deposit detection

**Expected Logs:**
```
[FCZ-PAY] Processing transfer: 1.5 USDC to user xxx
[FCZ-PAY] Deposit credited: 1.5 USD
```

### Step 8: Verify Deposit

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

-- Check event log
SELECT * FROM event_log
WHERE source = 'base-watcher'
ORDER BY ts DESC LIMIT 5;
```

### Step 9: Test Idempotency

Restart the server:
```bash
# Stop server (Ctrl+C)
npm run dev
```

Check balance again - it should NOT have doubled!

---

## Troubleshooting

### Mock Endpoint Returns "unknown user_id"
**Solution**: Use a real user ID from your `users` table

### Mock Endpoint Returns "tx insert failed"
**Solution**: Check that migrations ran successfully:
```sql
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'wallet_transactions';
```
Should include: `channel`, `provider`, `external_ref`, `meta`

### Real Chain: "USDC address missing in registry"
**Solution**: Insert address into `chain_addresses` table

### Real Chain: "USDC address has no bytecode"
**Solution**: 
1. Verify address is correct
2. Check you're on the right network (84532 for Sepolia)
3. Verify contract is deployed at that address

### Real Chain: Deposits not detected
**Solution**:
1. Check watcher started: `grep "watcher started" logs`
2. Verify deposit address in `crypto_addresses` table
3. Check transaction on BaseScan
4. Verify RPC connectivity: `curl $RPC_URL`

### Balance doubled after restart
**Solution**: This should NOT happen. Check:
```sql
SELECT external_ref, COUNT(*) 
FROM wallet_transactions 
WHERE provider = 'base-usdc'
GROUP BY external_ref
HAVING COUNT(*) > 1;
```

---

## Quick Reference

### Health Endpoints
```bash
# Check if payments enabled
curl http://localhost:3001/api/health/payments | jq .

# Check Base chain config
curl http://localhost:3001/api/health/base | jq .
```

### Database Queries
```sql
-- Recent deposits
SELECT * FROM wallet_transactions 
WHERE channel='crypto' 
ORDER BY created_at DESC LIMIT 10;

-- User balance
SELECT * FROM wallets WHERE user_id = 'YOUR_USER_ID';

-- Deposit addresses
SELECT * FROM crypto_addresses;

-- Contract addresses
SELECT * FROM chain_addresses;
```

### Environment Variables
```bash
# Enable payments
export PAYMENTS_ENABLE=1

# Enable deposits
export ENABLE_BASE_DEPOSITS=1

# Enable mock mode
export BASE_DEPOSITS_MOCK=1

# Set environment
export RUNTIME_ENV=qa
```

---

## Next Steps After Testing

1. ✅ Mock testing passes
2. ✅ Real chain testing passes  
3. ✅ Idempotency verified
4. → Deploy to production (follow PRODUCTION_DEPLOYMENT_GUIDE.md)
