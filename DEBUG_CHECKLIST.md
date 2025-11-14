# 🔍 Debug Checklist - Bet Placement 400/500 Errors

## 1. ✅ Confirm Client Payload

**Check:** DevTools → Network → Find the `/entries` request → Payload tab

**Expected:**
```json
{
  "option_id": "uuid-here",
  "stakeUSD": 5,
  "user_id": "user-uuid",
  "escrowLockId": "lock-uuid-here"  // ← MUST be present in crypto mode
}
```

**If `escrowLockId` is missing:**
- ✅ Fixed in `client/src/store/predictionStore.ts`
- Lock is created before entry, and `escrowLockId` is added to body
- Check console for: `📤 [Crypto Mode] Sending entry request with escrowLockId:`

## 2. ✅ Server Error Codes (Now Explicit)

The server now returns specific error codes:

| Error Code | Meaning | Fix |
|------------|---------|-----|
| `invalid_body` | Zod validation failed | Check request format |
| `escrowLockId_required` | Missing lock ID in crypto mode | Ensure lock is created first |
| `lock_not_found` | Lock doesn't exist | Check lock creation succeeded |
| `lock_user_mismatch` | Lock belongs to different user | User ID mismatch |
| `lock_not_locked` | Lock status != 'locked' | Lock may be consumed/released |
| `lock_prediction_mismatch` | Lock for different prediction | Prediction ID mismatch |
| `currency_not_usd` | Lock currency != USD | Currency mismatch |
| `insufficient_lock_amount` | Lock amount < stake | Need larger lock |
| `lock_already_consumed` | Lock was already used | Don't reuse lock IDs |
| `server_error` | Unexpected error | Check server logs |

**All errors include:**
- `error`: Specific error code
- `message`: Human-readable description
- `version`: API version
- `details`: Additional info (if applicable)

## 3. SQL Sanity Checks

**File:** `server/migrations/SANITY_CHECKS.sql`

Run these queries in Supabase SQL Editor, replacing placeholders:

```sql
-- Last 5 locks for user
SELECT id, user_id, prediction_id, amount, currency, status, created_at
FROM escrow_locks
WHERE user_id = 'YOUR_USER_ID_HERE'
ORDER BY created_at DESC
LIMIT 5;

-- Check specific lock status
SELECT id, status, state, user_id, prediction_id, amount, currency
FROM escrow_locks 
WHERE id = 'YOUR_LOCK_ID_HERE';

-- Verify prediction match
SELECT 
  'YOUR_PREDICTION_ID' AS url_id,
  (SELECT prediction_id FROM escrow_locks WHERE id = 'YOUR_LOCK_ID') AS lock_prediction_id;

-- Check amount sufficiency
SELECT 
  id,
  amount AS locked_amount,
  5.0 AS requested_stake,
  (amount >= 5.0) AS has_sufficient_funds
FROM escrow_locks 
WHERE id = 'YOUR_LOCK_ID';
```

## 4. Common Issues & Fixes

### Client not sending escrowLockId
**Fixed:** ✅ `predictionStore.ts` now ensures `escrowLockId` is always included in crypto mode

**Debug:**
```javascript
// In browser console, after clicking "Place Bet":
// Check Network tab → entries request → Payload
// Should see escrowLockId field
```

### Lock tied to different prediction
**Check:** Lock's `prediction_id` must match URL `predictionId`

**Fix:** Ensure `lockEscrow` call uses the same `predictionId` as the entry request

### Stake rounding issues
**Fixed:** ✅ Server accepts both `stakeUSD` (number/string) and legacy `amount`

**Validation:** Server validates `stakeUSD` is positive via Zod

### Provider/currency mismatch
**Check:**
```sql
SELECT provider, currency FROM escrow_locks WHERE id = 'LOCK_ID';
```
Should be: `provider='crypto-base-usdc'`, `currency='USD'`

**Fixed:** ✅ Escrow lock endpoint creates locks with correct values

## 5. Remove Demo Traces

**Already Fixed:**
- ✅ `server/src/routes/chain/activity.ts` - Filters `provider IN ('crypto-base-usdc')`
- ✅ Migration 110 deletes demo transactions

**Verify:**
```sql
-- Should return 0 rows
SELECT COUNT(*) FROM wallet_transactions WHERE provider = 'demo';
```

## 6. ✅ What Success Looks Like

When everything works, you'll see:

1. **Lock Creation:**
   ```
   🔒 [Crypto Mode] Creating escrow lock...
   ✅ [Crypto Mode] Escrow lock created: [uuid]
   ```

2. **Entry Request:**
   ```
   📤 [Crypto Mode] Sending entry request with escrowLockId: {...}
   ```

3. **Server Response:**
   ```json
   {
     "ok": true,
     "entryId": "entry-uuid",
     "data": { ... }
   }
   ```

4. **Database State:**
   ```sql
   -- Lock is consumed
   SELECT status FROM escrow_locks WHERE id = 'LOCK_ID';
   -- Returns: 'consumed'
   
   -- Entry exists with lock reference
   SELECT escrow_lock_id, provider FROM prediction_entries WHERE id = 'ENTRY_ID';
   -- Returns: lock_id, 'crypto-base-usdc'
   ```

5. **UI Updates:**
   - Wallet "available to stake" decreases by stake amount
   - Activity feed shows "Bet placed"
   - No demo balances visible

## Testing Steps

1. **Open DevTools** → Network tab
2. **Clear previous requests** (optional)
3. **Place a bet:**
   - Select option
   - Enter stake amount
   - Click "Place Bet"
4. **Check Network requests:**
   - `/api/escrow/lock` → Should return 201 with `escrowLockId`
   - `/api/v2/predictions/:id/entries` → Should return 201 with `ok: true`
5. **Check Console:**
   - Should see lock creation log
   - Should see entry request log
   - Should see success message
6. **Check Database:**
   - Lock status = 'consumed'
   - Entry has `escrow_lock_id` set
   - Activity shows transaction

## Quick Debug Commands

```bash
# View server logs
cd server && npm run dev | grep -E "Crypto Mode|entries|escrow"

# View client logs
# Open browser console, filter by "FCZ-PAY"
```

---

**All fixes are in place!** The system now:
- ✅ Validates requests with Zod
- ✅ Returns explicit error codes
- ✅ Logs detailed debug info
- ✅ Handles edge cases
- ✅ Prevents duplicate lock consumption

Just test placing a bet and check the Network tab to see exactly what's happening!

