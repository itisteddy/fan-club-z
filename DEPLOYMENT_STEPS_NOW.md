# 🚀 DEPLOY NOW - 5 MINUTES TOTAL

## Step 1: Run SQL Migration (2 minutes)

### Go to Supabase SQL Editor:
**Click this link:** https://supabase.com/dashboard/project/ihtnsyhknvltgrksffun/sql/new

### Copy & Paste:
1. Open file: **`COMBINED_MIGRATION_RUN_THIS.sql`** (in root folder)
2. Copy the ENTIRE file (all ~180 lines)
3. Paste into Supabase SQL Editor
4. Click **RUN** button (bottom right)

### Expected Result:
```
✅ Success. Rows affected: X
```

You'll see output from the SELECT statements showing:
- Columns added
- Indexes created
- Old locks deleted
- Verification results

---

## Step 2: Restart Server (1 minute)

```bash
cd server

# Stop current process
pkill -f "node.*server" || pkill -f "tsx"

# Start fresh
npm run dev
```

### Look for in the logs:
```
✅ Lock expiration cron job started
[CRON] Starting lock expiration job (runs every 60s)
[CRON] Checking for expired locks...
```

---

## Step 3: Verify (2 minutes)

### A) Check Database

Go back to Supabase SQL Editor and run:

```sql
-- Should show expires_at and lock_ref columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'escrow_locks' 
AND column_name IN ('expires_at', 'lock_ref');

-- Should return 3 indexes
SELECT indexname 
FROM pg_indexes 
WHERE tablename = 'escrow_locks' 
AND indexname LIKE 'idx_%lock%';
```

### B) Test in App

1. Open app: http://localhost:5174
2. Navigate to any prediction
3. Try to place a bet (any amount)
4. Check server logs:

```
[FCZ-BET] Creating new lock, expires at: 2025-11-02T...
```

5. Query database:

```sql
SELECT id, amount, status, expires_at, lock_ref, created_at
FROM escrow_locks
ORDER BY created_at DESC
LIMIT 1;
```

**Verify:**
- ✅ `expires_at` exists and is ~10 minutes in future
- ✅ `lock_ref` is a 32-character hash
- ✅ `status` is 'locked'

### C) Test Idempotency

1. Try double-clicking "Place Bet" quickly
2. Check server logs - should see:
   ```
   [FCZ-BET] Reusing existing lock: xxx-xxx-xxx
   ```
3. Query database - only ONE lock created

---

## Summary of Changes

### Database:
- ✅ Added `expires_at` column to escrow_locks
- ✅ Added `lock_ref` column to escrow_locks
- ✅ Created 3 new indexes for performance
- ✅ Added unique constraints to prevent duplicates
- ✅ Cleaned up old pending locks

### Server:
- ✅ Lock creation now sets expiration (10 min)
- ✅ Lock creation now sets lock_ref (idempotency)
- ✅ Balance calculation excludes expired locks
- ✅ Cron job expires old locks every 60s

### Client:
- ✅ Uses `useWalletSummary` for accurate balance
- ✅ Deleted old demo prediction page

---

## Troubleshooting

### "Column already exists"
**Solution:** This is fine! Means migration was already run. Continue to next step.

### Cron job not starting
**Solution:** 
```bash
# Check server/src/index.ts line ~274 has:
startLockExpirationJob();

# Restart server
```

### Balance still showing wrong
**Solution:**
```bash
# Hard refresh browser
Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)

# Clear client cache
cd client
rm -rf node_modules/.vite
npm run dev
```

---

## Success Criteria

After completing all steps, you should have:

1. ✅ Migration runs without errors
2. ✅ Server logs show: `✅ Lock expiration cron job started`
3. ✅ New locks have `expires_at` and `lock_ref`
4. ✅ Double-click doesn't create duplicates
5. ✅ Balance shows correctly in UI
6. ✅ Old locks cleaned up

---

## Files to Reference

1. **`COMBINED_MIGRATION_RUN_THIS.sql`** - The SQL to run
2. **`FIXES_SUMMARY.md`** - What was fixed
3. **`IMPLEMENTATION_COMPLETE_PHASE1.md`** - Technical details
4. **`ARCHITECTURE_REVIEW_AND_FIXES.md`** - Full analysis

---

## Time Estimate

- ⏱️ SQL Migration: 2 minutes
- ⏱️ Server Restart: 1 minute
- ⏱️ Testing: 2 minutes
- **Total: 5 minutes**

---

## Ready?

1. Open: https://supabase.com/dashboard/project/ihtnsyhknvltgrksffun/sql/new
2. Copy: `COMBINED_MIGRATION_RUN_THIS.sql`
3. Paste & Run
4. Restart server
5. Test

**That's it!** 🚀

