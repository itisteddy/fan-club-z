# Production Deployment Guide - P1 Crypto Deposits

## Pre-Deployment Checklist

### 1. Database Setup

Run these SQL commands in your Supabase SQL Editor:

```sql
-- 1. Create chain_addresses table
CREATE TABLE IF NOT EXISTS public.chain_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  env text NOT NULL CHECK (env IN ('local','qa','staging','prod')),
  chain_id integer NOT NULL,
  kind text NOT NULL CHECK (kind IN ('usdc','escrow')),
  address text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (env, chain_id, kind)
);

-- 2. Verify wallet schema
ALTER TABLE IF EXISTS public.wallet_transactions
  ADD COLUMN IF NOT EXISTS channel text,
  ADD COLUMN IF NOT EXISTS provider text,
  ADD COLUMN IF NOT EXISTS external_ref text,
  ADD COLUMN IF NOT EXISTS meta jsonb DEFAULT '{}'::jsonb;

CREATE UNIQUE INDEX IF NOT EXISTS wallet_tx_provider_extref_uidx
  ON public.wallet_transactions (provider, external_ref);

-- 3. Insert contract addresses for QA (Base Sepolia)
INSERT INTO chain_addresses (env, chain_id, kind, address)
VALUES 
  ('qa', 84532, 'usdc', '0xYourBaseSepolia_USDC_Address'),
  ('qa', 84532, 'escrow', '0xYourBaseSepolia_Escrow_Address')
ON CONFLICT (env, chain_id, kind) DO UPDATE SET address=EXCLUDED.address;

-- 4. Insert contract addresses for PRODUCTION (Base Mainnet)
INSERT INTO chain_addresses (env, chain_id, kind, address)
VALUES 
  ('prod', 8453, 'usdc', '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'), -- Base Mainnet USDC
  ('prod', 8453, 'escrow', '0xYourProduction_Escrow_Address')
ON CONFLICT (env, chain_id, kind) DO UPDATE SET address=EXCLUDED.address;
```

### 2. Environment Variables

#### QA Environment (`server/.env.qa`)
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

# Fiat (disabled for now)
ENABLE_PAYSTACK_DEPOSITS=0
ENABLE_PAYSTACK_WITHDRAWALS=0
```

#### Production Environment (`server/.env.production`)
```bash
# Master Flags
PAYMENTS_ENABLE=1
RUNTIME_ENV=prod
NODE_ENV=production

# Base Mainnet
CHAIN_ID=8453
RPC_URL=https://mainnet.base.org
RPC_WS_URL=wss://mainnet.base.org
ENABLE_BASE_DEPOSITS=1
BASE_DEPOSITS_MOCK=0

# Fiat (disabled for now)
ENABLE_PAYSTACK_DEPOSITS=0
ENABLE_PAYSTACK_WITHDRAWALS=0
```

### 3. Test User Setup (QA Only)

```sql
-- Get a test user ID
SELECT id, email FROM users LIMIT 5;

-- Create wallet for test user
INSERT INTO wallets (user_id, currency, available_balance, reserved_balance)
VALUES ('YOUR_TEST_USER_ID', 'USD', 0, 0)
ON CONFLICT (user_id, currency) DO NOTHING;

-- Create deposit address for test user
INSERT INTO crypto_addresses (user_id, chain_id, address)
VALUES ('YOUR_TEST_USER_ID', 84532, '0xYourTestUserDepositAddress')
ON CONFLICT (chain_id, address) DO NOTHING;
```

## Deployment Steps

### Step 0: Freeze Addresses
✅ Ensure all contract addresses are in `chain_addresses` table
✅ Verify bytecode exists at each address using block explorer

### Step 1: Deploy to QA

```bash
# 1. Set environment
export NODE_ENV=qa
export RUNTIME_ENV=qa

# 2. Start server
cd server && npm run dev

# 3. Verify health endpoints
curl http://localhost:3001/api/health/base | jq .
# Expected: payments_enable=true, base_deposits_enabled=true, usdc_set=true

curl http://localhost:3001/api/health/payments | jq .
# Expected: crypto.enabled=true
```

### Step 2: QA Testing

#### A. Mock Deposit Test
```bash
# Enable mock mode temporarily
export BASE_DEPOSITS_MOCK=1

# Test mock endpoint
curl -X POST http://localhost:3001/api/qa/crypto/mock-deposit \
  -H "Content-Type: application/json" \
  -d '{"user_id":"YOUR_TEST_USER_ID","amount":12.5}'

# Expected: {"ok":true,"credited":true}

# Verify in database
SELECT * FROM wallet_transactions 
WHERE provider='base-usdc' 
ORDER BY created_at DESC LIMIT 5;

SELECT available_balance FROM wallets 
WHERE user_id='YOUR_TEST_USER_ID';
```

#### B. Real Chain Test (Base Sepolia)
```bash
# Disable mock mode
export BASE_DEPOSITS_MOCK=0

# 1. Send 1-2 USDC to test user's deposit address on Base Sepolia
# 2. Watch server logs for deposit detection
# 3. Verify in database (same queries as above)
# 4. Restart server - balance should NOT double (idempotency test)
```

### Step 3: Production Deployment

#### Pre-Flight Checks
- [ ] All QA tests passed
- [ ] Escrow contract deployed and verified on Base Mainnet
- [ ] Production addresses in `chain_addresses` table
- [ ] Bytecode verified at all production addresses
- [ ] Environment variables set correctly
- [ ] Monitoring/alerting configured

#### Deploy
```bash
# 1. Set production environment
export NODE_ENV=production
export RUNTIME_ENV=prod

# 2. Start server (will fail-fast if config invalid)
cd server && npm start

# 3. Verify health
curl https://your-api.com/api/health/base
curl https://your-api.com/api/health/payments

# 4. Smoke test with $0.01 deposit
# Send 0.01 USDC to a test user
# Verify single ledger entry and balance increase
```

### Step 4: Monitoring

#### Health Checks
```bash
# Base chain health
GET /api/health/base
{
  "payments_enable": true,
  "base_deposits_enabled": true,
  "chain_id": "8453",
  "have_rpc": true,
  "have_ws": true,
  "usdc_set": true
}

# Overall payments health
GET /api/health/payments
{
  "payments_enable": true,
  "crypto": {
    "enabled": true,
    "have_rpc": true,
    "have_usdc": true
  },
  "fiat": {
    "enabled": false,
    "have_key": false
  }
}
```

#### Database Queries
```sql
-- Recent deposits
SELECT 
  user_id,
  amount,
  status,
  external_ref,
  created_at
FROM wallet_transactions
WHERE channel='crypto' AND provider='base-usdc'
ORDER BY created_at DESC
LIMIT 20;

-- Deposit summary
SELECT 
  COUNT(*) as total_deposits,
  SUM(amount) as total_amount,
  AVG(amount) as avg_amount
FROM wallet_transactions
WHERE channel='crypto' AND provider='base-usdc' AND status='success';

-- Failed/pending transactions
SELECT * FROM wallet_transactions
WHERE channel='crypto' AND status != 'success';
```

## Rollback Plan

If issues occur in production:

```bash
# 1. Disable deposits immediately
export ENABLE_BASE_DEPOSITS=0

# 2. Restart server
# Watcher will not start, but existing balances remain intact

# 3. Investigate logs
tail -f /var/log/fanclubz/server.log | grep FCZ-PAY

# 4. Fix and redeploy
# Re-enable after fix verified in QA
```

## Common Issues & Solutions

### Issue: "USDC address missing in registry"
**Solution**: Insert address into `chain_addresses` table for correct env/chain_id

### Issue: "USDC address has no bytecode on-chain"
**Solution**: Verify contract address is correct and deployed on the specified chain

### Issue: Deposits not detected
**Solution**: 
1. Check watcher is running: `grep "watcher started" logs`
2. Verify RPC connectivity: `curl $RPC_URL`
3. Check deposit address in `crypto_addresses` table
4. Verify transaction on block explorer

### Issue: Balance doubled after restart
**Solution**: Idempotency working correctly - check `external_ref` uniqueness

## Support Contacts

- DevOps: [contact]
- Backend: [contact]
- On-call: [contact]
