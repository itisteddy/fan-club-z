# 🚀 Deployment Instructions - Phase 1 Fixes

## Overview

This guide will help you deploy all Phase 1 critical fixes to production. Follow these steps in order.

---

## Prerequisites

- Access to Supabase SQL Editor
- Server access (to restart backend)
- Client access (to rebuild frontend)

---

## Step-by-Step Deployment

### 1️⃣ Run Database Migrations (Supabase SQL Editor)

**Open:** Supabase Dashboard → SQL Editor → New Query

#### Migration 114: Lock Expiration
Copy and paste the entire contents of:
```
server/migrations/114_add_lock_expiration.sql
```

Click **Run** and verify:
- ✅ "Success. No rows returned"
- ✅ Check: `SELECT expires_at FROM escrow_locks LIMIT 1;` should work

#### Migration 115: Idempotency
Copy and paste the entire contents of:
```
server/migrations/115_lock_idempotency.sql
```

Click **Run** and verify:
- ✅ "Success. No rows returned"
- ✅ Check: `SELECT lock_ref FROM escrow_locks LIMIT 1;` should work

#### Clean Up Old Locks
Copy and paste the entire contents of:
```
cleanup-locks.sql
```

Click **Run** and verify the output shows how many locks were cleaned up.

---

### 2️⃣ Restart Backend Server

```bash
# Stop current server
cd server
pkill -f "node.*server" || pkill -f "tsx.*index"

# Clear any caches
rm -rf dist/ .cache/

# Start server
npm run dev
```

**Verify startup logs show:**
```
✅ Lock expiration cron job started
[CRON] Starting lock expiration job (runs every 60s)
[CRON] Checking for expired locks...
```

---

### 3️⃣ Rebuild Frontend (Optional)

The frontend changes are already compiled. If you want to force a rebuild:

```bash
cd client
npm run build
# or just restart dev server
npm run dev
```

---

### 4️⃣ Verify Deployment

#### A) Check Database Schema

```sql
-- Should return 2 rows (expires_at and lock_ref columns)
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'escrow_locks'
AND column_name IN ('expires_at', 'lock_ref');
```

#### B) Check Unique Constraints

```sql
-- Should return 2 rows (idempotency indexes)
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'escrow_locks'
AND indexname IN ('idx_one_active_lock_per_prediction', 'idx_unique_lock_ref');
```

#### C) Test Lock Creation

1. Open app in browser
2. Navigate to any prediction
3. Try to place a bet (any amount)
4. Check server logs - should see:
   ```
   [FCZ-BET] Creating new lock, expires at: 2025-11-02T14:15:00.000Z
   ```

5. Query database:
   ```sql
   SELECT id, user_id, amount, status, expires_at, lock_ref, created_at
   FROM escrow_locks
   ORDER BY created_at DESC
   LIMIT 1;
   ```
   
   Verify:
   - ✅ `expires_at` is ~10 minutes in the future
   - ✅ `lock_ref` is a 32-character hash
   - ✅ `status` is 'locked'

#### D) Test Lock Expiration

**Option 1: Wait 10 minutes** (real test)
- Place a bet and abandon it
- Wait 10 minutes
- Check server logs at next cron run (~60s intervals)
- Should see: `[CRON] ✅ Expired 1 locks, total amount: $X.XX`

**Option 2: Manual expiration** (quick test)
```sql
-- Manually expire a lock
UPDATE escrow_locks
SET expires_at = NOW() - INTERVAL '1 minute'
WHERE id = 'SOME_LOCK_ID';

-- Wait for cron job (max 60s)
-- Check status changed to 'expired'
SELECT id, status, expires_at
FROM escrow_locks
WHERE id = 'SOME_LOCK_ID';
```

#### E) Test Idempotency

1. Place a bet
2. While server is processing, click "Place Bet" again
3. Should see in logs:
   ```
   [FCZ-BET] Reusing existing lock: xxx-xxx-xxx
   ```
4. Check database - only ONE lock created, not two

---

## 5️⃣ Monitor for Issues

### Watch Server Logs

```bash
# In server directory
npm run dev

# Look for:
[CRON] Checking for expired locks...      # Every 60s
[CRON] ✅ Expired X locks...                # When locks expire
[CRON] No expired locks found              # When system is healthy
[FCZ-BET] Creating new lock, expires at:  # When bets placed
[FCZ-BET] Reusing existing lock:          # When idempotency works
```

### Watch for Errors

```bash
# Should NOT see:
❌ [CRON] Error expiring locks
❌ [FCZ-BET] Error creating lock
❌ duplicate key value violates unique constraint

# If you see these, check migration status
```

---

## 🔧 Troubleshooting

### Issue: Cron job not starting

**Symptoms:**
- No `[CRON]` logs in server output
- Locks not expiring automatically

**Solution:**
```bash
# Check server/src/index.ts has:
import { startLockExpirationJob } from './cron/expireLocks';

# And near the end:
startLockExpirationJob();

# Restart server
```

---

### Issue: Duplicate locks still being created

**Symptoms:**
- Multiple locks with same user_id + prediction_id
- Users getting charged twice

**Solution:**
```sql
-- Check if unique index exists
SELECT * FROM pg_indexes 
WHERE indexname = 'idx_one_active_lock_per_prediction';

-- If not found, run migration 115 again
```

---

### Issue: Balance not updating after expiration

**Symptoms:**
- Locks expire but balance still shows as locked
- UI not refreshing

**Solution:**
1. Check server code filters expires_at:
   ```typescript
   // Should include: .gt('expires_at', new Date().toISOString())
   ```

2. Force client refresh:
   ```bash
   cd client
   rm -rf .vite/ node_modules/.vite
   npm run dev
   ```

3. Hard refresh browser: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)

---

### Issue: Migration fails

**Symptoms:**
```
ERROR: column "expires_at" already exists
ERROR: relation "idx_one_active_lock_per_prediction" already exists
```

**Solution:**
This is OK! It means migrations were already run. Skip to verification step.

---

## 📊 Post-Deployment Checks

### Day 1 Checklist

- [ ] Server logs show cron job running every 60s
- [ ] No error logs related to locks
- [ ] Users able to place bets
- [ ] Double-click doesn't create duplicates
- [ ] Abandoned bets auto-expire in 10 min
- [ ] Balance correctly shows available amount

### Week 1 Monitoring

- [ ] Check for accumulation of expired locks:
   ```sql
   SELECT status, COUNT(*) 
   FROM escrow_locks 
   GROUP BY status;
   
   -- 'expired' count should be low (cron is cleaning up)
   ```

- [ ] Monitor cron job logs for patterns
- [ ] Check user complaints about stuck balances (should be zero)

---

## 🎉 Success Criteria

You'll know deployment was successful when:

1. ✅ **Cron logs appear every 60 seconds**
2. ✅ **New locks have expires_at and lock_ref**
3. ✅ **No duplicate locks created** (unique constraint working)
4. ✅ **Abandoned bets auto-expire** within 10 minutes
5. ✅ **User balances accurate** (available = total - active locks)
6. ✅ **No permanent balance leaks** (old issue is fixed)

---

## 🆘 Rollback Plan (Emergency Only)

If something goes seriously wrong:

### Database Rollback

```sql
-- Remove expires_at column
ALTER TABLE escrow_locks DROP COLUMN IF EXISTS expires_at;

-- Remove lock_ref column
ALTER TABLE escrow_locks DROP COLUMN IF EXISTS lock_ref;

-- Remove unique indexes
DROP INDEX IF EXISTS idx_one_active_lock_per_prediction;
DROP INDEX IF EXISTS idx_unique_lock_ref;
DROP INDEX IF EXISTS idx_escrow_locks_expires;
```

### Server Rollback

```bash
# Revert server/src/index.ts to remove cron job
# Comment out:
# startLockExpirationJob();

# Restart server
cd server
npm run dev
```

**Note:** Rollback is rarely needed. Most issues can be fixed with a simple server restart.

---

## 📞 Support

If you encounter issues:

1. Check this troubleshooting guide first
2. Review server logs for specific error messages
3. Run verification queries to diagnose
4. Refer to `ARCHITECTURE_REVIEW_AND_FIXES.md` for detailed explanation

---

## Next Steps After Deployment

Once Phase 1 is stable (1-2 days), proceed with:

- **Phase 2:** Smart contract integration, deposit watcher
- **Phase 3:** UX improvements, loading states

See `ARCHITECTURE_REVIEW_AND_FIXES.md` for full roadmap.

---

**Deployment Prepared:** 2025-11-02
**Estimated Time:** 15-20 minutes
**Risk Level:** LOW (all changes are additive, no breaking changes)

Ready to deploy? Follow the steps above in order. Good luck! 🚀
