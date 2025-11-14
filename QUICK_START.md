# ⚡ QUICK START - Crypto Deposits

## 🔧 1. Add to `server/.env`

```bash
PAYMENTS_ENABLE=1
ENABLE_BASE_DEPOSITS=1
BASE_DEPOSITS_MOCK=0
CHAIN_ID=84532
RPC_URL=https://sepolia.base.org
RPC_WS_URL=wss://base-sepolia-rpc.publicnode.com
USDC_ADDRESS=0x5B966ca41aB58E50056EE1711c9766Ca3382F115
RUNTIME_ENV=qa
```

## ✅ 2. Verify Setup

```bash
./verify-server-env.sh
```

## 🚀 3. Start Server (Terminal 1)

```bash
cd server && npx tsx src/index.ts
```

Wait for: `[FCZ-PAY] ✅ Deposit watcher started successfully`

## 💸 4. Send Test Deposit (Terminal 2)

```bash
cd contracts && npx hardhat run scripts/send-test-deposit.js --network baseSepolia
```

## 👀 5. Check Results

**Server logs should show:**
```
[FCZ-PAY] Credited user ... with 10 USDC
```

**Supabase query:**
```sql
SELECT available_balance FROM wallets 
WHERE user_id = '00000000-0000-0000-0000-000000000000';
```

**Expected:** `10`

---

## 🎉 That's It!

Your crypto deposit system is now fully functional!

For detailed instructions, see **[FINAL_SETUP_INSTRUCTIONS.md](./FINAL_SETUP_INSTRUCTIONS.md)**

