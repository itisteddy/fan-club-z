# 🚀 Run Migrations NOW - 5 Minutes

## You have access, here's how to run them:

### Option 1: Supabase SQL Editor (Recommended - 3 minutes)

1. Open: https://supabase.com/dashboard/project/ihtnsyhknvltgrksffun/sql/new

2. **Copy & Paste Migration 114:**
   - Open file: `server/migrations/114_add_lock_expiration.sql`
   - Copy ALL contents
   - Paste into SQL Editor
   - Click **RUN**
   - ✅ Should see "Success. No rows returned"

3. **Copy & Paste Migration 115:**
   - Open file: `server/migrations/115_lock_idempotency.sql`
   - Copy ALL contents
   - Paste into SQL Editor
   - Click **RUN**
   - ✅ Should see "Success. No rows returned"

4. **Copy & Paste Cleanup:**
   - Open file: `cleanup-locks.sql`
   - Copy ALL contents
   - Paste into SQL Editor
   - Click **RUN**
   - ✅ Should see how many locks were deleted

**Done!** Now restart the server.

---

### Option 2: Direct SQL (If you prefer command line)

```bash
# Install psql if needed
# brew install postgresql (Mac)

# Get connection string from Supabase Dashboard → Settings → Database
# Then run:

psql "postgresql://postgres:[password]@db.ihtnsyhknvltgrksffun.supabase.co:5432/postgres" \
  -f server/migrations/114_add_lock_expiration.sql

psql "postgresql://postgres:[password]@db.ihtnsyhknvltgrksffun.supabase.co:5432/postgres" \
  -f server/migrations/115_lock_idempotency.sql

psql "postgresql://postgres:[password]@db.ihtnsyhknvltgrksffun.supabase.co:5432/postgres" \
  -f cleanup-locks.sql
```

---

## After Running Migrations

### Restart Server:
```bash
cd server
pkill -f "node.*server" || true
npm run dev
```

### Verify in logs:
```
✅ Lock expiration cron job started
[CRON] Checking for expired locks...
```

### Test:
1. Place a bet on any prediction
2. Check database:
```sql
SELECT id, amount, status, expires_at, lock_ref, created_at
FROM escrow_locks
ORDER BY created_at DESC
LIMIT 1;
```

Should show:
- ✅ `expires_at` is ~10 minutes in future
- ✅ `lock_ref` is a 32-char hash
- ✅ `status` is 'locked'

---

## Why I Can't Run Them Directly

The issue is that:
1. Supabase doesn't expose a direct SQL execution API endpoint
2. The connection requires the database password (not in `.env`)
3. The `exec_sql` RPC function doesn't exist in your Supabase instance

The **Supabase SQL Editor** is the official way to run migrations, and it's the fastest (just copy/paste).

---

## Quick Link

**Go here now:** https://supabase.com/dashboard/project/ihtnsyhknvltgrksffun/sql/new

Then copy/paste the 3 SQL files in order.

Takes 3 minutes total!

