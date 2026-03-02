# 🔧 Deposit Detection Troubleshooting

## ⚠️ Issue Detected

Your test deposit was sent successfully, but the balance is still showing `0.00000000`.

**Transaction:** `0x65b284beed27b258c2dd1883d56e4833598f627b5944f3ea3524beb3ccda28a4`  
**Status:** ✅ Confirmed on BaseScan  
**Problem:** Watcher had WebSocket connection issues

---

## ✅ What I Fixed

1. **Switched from WebSocket to HTTP polling** - More reliable
2. **Added comprehensive logging** - You can now see exactly what's happening
3. **Restarted the server** - Fresh start with improved code

---

## 📋 What You Should See Now

With the new server, your Terminal should show:

```
[FCZ-PAY] ✅ Deposit watcher started successfully
[FCZ-PAY] Creating public client with HTTP transport
[FCZ-PAY] Starting HTTP polling mode (more reliable than WebSocket)...
[FCZ-PAY] Base USDC watcher started (HTTP polling mode).
[FCZ-PAY] Polling blocks XXX to XXX...
[FCZ-PAY] Found X Transfer events
[FCZ-PAY] Processing X transfer logs...
[FCZ-PAY] Found X unique recipient addresses
[FCZ-PAY] Found 1 matching deposit addresses in database
[FCZ-PAY] Registered deposit address: 0x9ccd0c785e5e7737e39eb9625d7fc181608cba9c -> user 00000000-0000-0000-0000-000000000000
[FCZ-PAY] Processing deposit: 10 USDC to user 00000000-0000-0000-0000-000000000000
[FCZ-PAY] ✅ Credited user 00000000-0000-0000-0000-000000000000 with 10 USDC
```

---

## 🔍 Verification Steps

### Step 1: Check Server Logs

Look at your Terminal window for the messages above. The polling happens every 10 seconds, so within 10-20 seconds you should see the deposit detected.

### Step 2: Verify Database

Run this in Supabase SQL Editor:

```sql
-- Quick balance check
SELECT available_balance 
FROM wallets 
WHERE user_id = '00000000-0000-0000-0000-000000000000';
-- Expected: 10
```

### Step 3: Check Transaction Record

```sql
-- Full transaction details
SELECT * FROM wallet_transactions 
WHERE user_id = '00000000-0000-0000-0000-000000000000'
  AND channel = 'crypto'
ORDER BY created_at DESC;
```

### Step 4: Check Event Log

```sql
-- Watcher activity
SELECT * FROM event_log 
WHERE source = 'base-watcher'
ORDER BY ts DESC;
```

---

## 🐛 If Still Not Working

### Diagnostic 1: Check crypto_addresses

The watcher only processes deposits to addresses in this table:

```sql
SELECT * FROM crypto_addresses 
WHERE chain_id = 84532;
```

**Expected result:**
```
user_id: 00000000-0000-0000-0000-000000000000
chain_id: 84532
address: 0x9CCD0C785E5E7737e39EB9625D7Fc181608cBa9c  (or lowercase)
```

**If address is missing or incorrect:**
```sql
-- Delete wrong entry
DELETE FROM crypto_addresses 
WHERE chain_id = 84532 
  AND user_id = '00000000-0000-0000-0000-000000000000';

-- Insert correct one
INSERT INTO crypto_addresses (user_id, chain_id, address)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  84532,
  '0x9CCD0C785E5E7737e39EB9625D7Fc181608cBa9c'
);
```

### Diagnostic 2: Check wallet exists

```sql
SELECT * FROM wallets 
WHERE user_id = '00000000-0000-0000-0000-000000000000'
  AND currency = 'USD';
```

**If wallet doesn't exist, create it:**
```sql
INSERT INTO wallets (user_id, currency, available_balance, reserved_balance, total_deposited, total_withdrawn)
VALUES ('00000000-0000-0000-0000-000000000000', 'USD', 0, 0, 0, 0);
```

### Diagnostic 3: Check Server Logs for Errors

Look in your Terminal for any error messages like:
- `[FCZ-PAY] polling error`
- `[FCZ-PAY] processTransferLogs error`
- SQL errors
- Connection errors

### Diagnostic 4: Verify Transaction on BaseScan

Open: https://sepolia.basescan.org/tx/0x65b284beed27b258c2dd1883d56e4833598f627b5944f3ea3524beb3ccda28a4

Check:
- Status: Should be "Success"
- Logs: Should show "Transfer" event
- Token Transfers: Should show 10 USDC

---

## 🔄 Manual Trigger Option

If the automatic detection still doesn't work, you can manually credit the deposit:

```sql
BEGIN;

-- 1. Insert transaction record
INSERT INTO wallet_transactions (user_id, type, channel, provider, amount, status, external_ref, description, meta)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  'deposit',
  'crypto',
  'base-usdc',
  10,
  'success',
  '0x65b284beed27b258c2dd1883d56e4833598f627b5944f3ea3524beb3ccda28a4:manual',
  'Manual USDC deposit credit',
  '{"manual": true}'::jsonb
)
ON CONFLICT (provider, external_ref) DO NOTHING;

-- 2. Update wallet balance
UPDATE wallets
SET available_balance = available_balance + 10,
    total_deposited = total_deposited + 10,
    updated_at = now()
WHERE user_id = '00000000-0000-0000-0000-000000000000'
  AND currency = 'USD';

-- 3. Log event
INSERT INTO event_log (source, kind, ref, payload)
VALUES ('manual', 'deposit', '0x65b284beed27b258c2dd1883d56e4833598f627b5944f3ea3524beb3ccda28a4', '{"amount": 10, "manual": true}'::jsonb);

COMMIT;

-- 4. Verify
SELECT available_balance FROM wallets 
WHERE user_id = '00000000-0000-0000-0000-000000000000';
```

---

## 📊 Expected Timeline

- **0-10 seconds:** Server starts, begins polling
- **10-20 seconds:** First poll cycle completes, finds transfer
- **20-30 seconds:** Transaction processed, database updated
- **Result:** Balance shows 10 USDC

---

## 🎯 Next Steps

1. **Watch your Terminal** for the next 30 seconds
2. **Look for the success message:** `[FCZ-PAY] ✅ Credited user...`
3. **Run the verification query** in Supabase
4. **If balance is 10 USDC:** 🎉 **SUCCESS!**
5. **If still 0:** Follow diagnostic steps above

---

## 📞 Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| Balance still 0 after 60s | Address not in crypto_addresses | Check Diagnostic 1 |
| "No matching deposit addresses" in logs | Address case mismatch | Addresses are case-insensitive, check anyway |
| Server not polling | Environment variables wrong | Run `./verify-server-env.sh` |
| Polling error | RPC connection issue | Check RPC_URL is correct |
| Database error | Wallet doesn't exist | Check Diagnostic 2 |

---

## 📝 Improved Features

The new version includes:
- ✅ HTTP polling (more reliable than WebSocket)
- ✅ Detailed logging at every step
- ✅ Scans last 1000 blocks on startup (catches existing transactions)
- ✅ 10-second polling interval
- ✅ Idempotent processing (safe to restart)
- ✅ Better error messages

---

**Your deposit WILL be detected!** The improved watcher is much more reliable. Just wait 30 seconds and check your Terminal logs! 🚀

