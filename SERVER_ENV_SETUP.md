# Server Environment Setup for Deposit Watcher

## Required Environment Variables

Add these to your `server/.env` file:

```bash
# Payment System
PAYMENTS_ENABLE=1
ENABLE_BASE_DEPOSITS=1
BASE_DEPOSITS_MOCK=0

# Base Sepolia Configuration
CHAIN_ID=84532
RPC_URL=https://sepolia.base.org
RPC_WS_URL=wss://base-sepolia-rpc.publicnode.com

# Contract Addresses
USDC_ADDRESS=0x5B966ca41aB58E50056EE1711c9766Ca3382F115

# Runtime Environment
RUNTIME_ENV=qa

# Supabase (you should already have these)
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_key
```

## What These Do:

- `PAYMENTS_ENABLE=1` - Enables the payment system
- `ENABLE_BASE_DEPOSITS=1` - Enables the Base USDC deposit watcher
- `BASE_DEPOSITS_MOCK=0` - Uses real blockchain (set to 1 for mock testing)
- `CHAIN_ID=84532` - Base Sepolia testnet
- `RPC_URL` - HTTP endpoint for reading blockchain data
- `RPC_WS_URL` - WebSocket endpoint for real-time event watching
- `USDC_ADDRESS` - Your deployed TestUSDC contract
- `RUNTIME_ENV=qa` - Used to query the `chain_addresses` table

## Quick Start

1. **Update your server/.env** with the variables above
2. **Start the server:**
   ```bash
   cd server
   npm run dev
   ```
3. **Look for this in the logs:**
   ```
   [FCZ-PAY] ✅ Deposit watcher started successfully
   [FCZ-PAY] Base USDC watcher started (watchEvent).
   ```

Once the server is running, the watcher will automatically detect any USDC transfers to addresses in your `crypto_addresses` table!

