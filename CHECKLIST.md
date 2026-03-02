# ✅ Crypto Deposit System - Implementation Checklist

## Phase 1: Smart Contract Deployment ✅

- [x] Install Hardhat and dependencies
- [x] Create TestUSDC contract
- [x] Configure Hardhat for Base Sepolia
- [x] Get Base Sepolia ETH for gas
- [x] Deploy TestUSDC contract
- [x] Verify contract on BaseScan
- [x] Mint initial USDC supply (1M USDC)

**Contract Address:** `0x5B966ca41aB58E50056EE1711c9766Ca3382F115`

---

## Phase 2: Database Setup ✅

- [x] Create `chain_addresses` table
- [x] Insert USDC contract address for QA environment
- [x] Create `crypto_addresses` table  
- [x] Insert test user deposit address
- [x] Verify `wallet_transactions` table exists
- [x] Verify `wallets` table exists
- [x] Verify `event_log` table exists

**Test User ID:** `00000000-0000-0000-0000-000000000000`  
**Deposit Address:** `0x9CCD0C785E5E7737e39EB9625D7Fc181608cBa9c`

---

## Phase 3: Server Configuration ⏳

- [ ] Open `server/.env`
- [ ] Add `PAYMENTS_ENABLE=1`
- [ ] Add `ENABLE_BASE_DEPOSITS=1`
- [ ] Add `BASE_DEPOSITS_MOCK=0`
- [ ] Add `CHAIN_ID=84532`
- [ ] Add `RPC_URL=https://sepolia.base.org`
- [ ] Add `RPC_WS_URL=wss://base-sepolia-rpc.publicnode.com`
- [ ] Add `USDC_ADDRESS=0x5B966ca41aB58E50056EE1711c9766Ca3382F115`
- [ ] Add `RUNTIME_ENV=qa`
- [ ] Verify existing Supabase credentials are intact
- [ ] Run `./verify-server-env.sh` to confirm

---

## Phase 4: Testing ⏳

### Start Server
- [ ] Open Terminal 1
- [ ] Run `cd server && npx tsx src/index.ts`
- [ ] Wait for `[FCZ-PAY] ✅ Deposit watcher started successfully`
- [ ] Verify no error messages
- [ ] Keep server running

### Send Test Deposit
- [ ] Open Terminal 2 (keep Terminal 1 running)
- [ ] Run `cd contracts`
- [ ] Run `npx hardhat run scripts/send-test-deposit.js --network baseSepolia`
- [ ] Note the transaction hash
- [ ] Copy the BaseScan link

### Verify Detection
- [ ] Switch to Terminal 1 (server logs)
- [ ] Look for `[FCZ-PAY] Processing transfer logs...`
- [ ] Look for `[FCZ-PAY] Credited user ... with 10 USDC`
- [ ] If not shown, wait 10-30 seconds

### Verify Database
- [ ] Open Supabase SQL Editor
- [ ] Run: `SELECT * FROM wallets WHERE user_id = '00000000-0000-0000-0000-000000000000'`
- [ ] Verify `available_balance = 10`
- [ ] Run: `SELECT * FROM wallet_transactions WHERE user_id = '00000000-0000-0000-0000-000000000000' ORDER BY created_at DESC LIMIT 1`
- [ ] Verify `type = 'deposit'`, `channel = 'crypto'`, `provider = 'base-usdc'`, `amount = 10`
- [ ] Run: `SELECT * FROM event_log WHERE source = 'base-watcher' ORDER BY ts DESC LIMIT 1`
- [ ] Verify deposit event is logged

### Verify on BaseScan
- [ ] Open the BaseScan link from the test deposit
- [ ] Verify status is "Success"
- [ ] Verify "To" address matches your deposit address
- [ ] Verify value is 10 USDC

---

## Phase 5: Additional Testing (Optional) ⏳

### Test Multiple Deposits
- [ ] Run send-test-deposit.js again
- [ ] Verify balance increases to 20 USDC
- [ ] Verify both transactions in database

### Test Idempotency
- [ ] Restart the server
- [ ] Verify balances don't double
- [ ] Check `wallet_transactions` for duplicates (should be none)

### Test with Different Amount
- [ ] Edit `send-test-deposit.js` to send different amount
- [ ] Run the script
- [ ] Verify correct amount is credited

---

## Success Criteria 🎯

All of these must be true:

- [x] ✅ Contract deployed and verified on Base Sepolia
- [x] ✅ Database tables created and populated
- [ ] ⏳ Server starts without errors
- [ ] ⏳ Deposit watcher logs show successful startup
- [ ] ⏳ Test deposit transaction succeeds
- [ ] ⏳ Server detects and logs the deposit
- [ ] ⏳ Database balance increases correctly
- [ ] ⏳ Transaction recorded in `wallet_transactions`
- [ ] ⏳ Event logged in `event_log`
- [ ] ⏳ No duplicate transactions on server restart

---

## Troubleshooting Reference 🔧

| Issue | Solution |
|-------|----------|
| Server won't start | Run `./verify-server-env.sh` to check missing variables |
| "Missing required environment variables" | Add all 8 variables to `server/.env` |
| Watcher not started | Check `PAYMENTS_ENABLE=1` and `ENABLE_BASE_DEPOSITS=1` |
| Deposit not detected | Verify address in `crypto_addresses`, wait 30s |
| Transaction fails | Check ETH balance for gas, verify on BaseScan |
| Balance not updating | Check server logs for errors, verify Supabase connection |

---

## Quick Command Reference 📝

```bash
# Verify environment
./verify-server-env.sh

# Start server
cd server && npx tsx src/index.ts

# Check USDC balance
cd contracts && npx hardhat run scripts/check-balance.js --network baseSepolia

# Send test deposit
cd contracts && npx hardhat run scripts/send-test-deposit.js --network baseSepolia

# Check database
psql -c "SELECT * FROM wallets WHERE user_id = '00000000-0000-0000-0000-000000000000'"
```

---

**Current Progress: 65% Complete** 🚀

**Next Step:** Configure `server/.env` (see Phase 3 above)

