# Apply Migration 116: Fix escrow_locks Schema

## ⚠️ CRITICAL: This migration must be applied to fix bet placement

The bet placement system is currently failing because the database CHECK constraint doesn't allow the `'consumed'` state value that the code is trying to use.

---

## Option 1: Apply via Supabase Dashboard (RECOMMENDED)

1. **Go to Supabase SQL Editor:**
   ```
   https://supabase.com/dashboard/project/ihtnsyhknvltgrksffun/sql/new
   ```

2. **Copy the SQL below and paste it into the editor:**

```sql
-- Migration 116: Fix escrow_locks schema inconsistencies
-- Problem: 'state' column CHECK constraint doesn't allow 'consumed'
-- Solution: Update constraint to match actual usage

-- Step 1: Drop the old CHECK constraint on 'state'
ALTER TABLE public.escrow_locks 
  DROP CONSTRAINT IF EXISTS escrow_locks_state_check;

-- Step 2: Add new CHECK constraint that includes 'consumed'
ALTER TABLE public.escrow_locks
  ADD CONSTRAINT escrow_locks_state_check 
  CHECK (state IN ('locked', 'released', 'voided', 'consumed', 'expired'));

-- Step 3: Ensure 'status' column exists with correct constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'escrow_locks' 
    AND column_name = 'status'
  ) THEN
    ALTER TABLE public.escrow_locks 
      ADD COLUMN status text;
  END IF;
END $$;

-- Step 4: Drop old status constraint if it exists
ALTER TABLE public.escrow_locks 
  DROP CONSTRAINT IF EXISTS escrow_locks_status_check;

-- Step 5: Add matching constraint for 'status'
ALTER TABLE public.escrow_locks
  ADD CONSTRAINT escrow_locks_status_check 
  CHECK (status IS NULL OR status IN ('locked', 'released', 'voided', 'consumed', 'expired'));

-- Step 6: Sync status from state for existing rows
UPDATE public.escrow_locks 
SET status = state 
WHERE status IS NULL OR status != state;

-- Step 7: Add helpful indexes
CREATE INDEX IF NOT EXISTS idx_escrow_locks_state 
  ON public.escrow_locks(state) 
  WHERE state IN ('locked', 'consumed');

CREATE INDEX IF NOT EXISTS idx_escrow_locks_user_state 
  ON public.escrow_locks(user_id, state, created_at DESC);

-- Step 8: Add lock_ref column if missing (for idempotency)
ALTER TABLE public.escrow_locks
  ADD COLUMN IF NOT EXISTS lock_ref text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_escrow_locks_lock_ref 
  ON public.escrow_locks(lock_ref) 
  WHERE lock_ref IS NOT NULL;

-- Step 9: Add option_id column if missing (for better tracking)
ALTER TABLE public.escrow_locks
  ADD COLUMN IF NOT EXISTS option_id uuid;

-- Verification query
SELECT 
  'escrow_locks schema updated' as status,
  COUNT(*) as total_locks,
  COUNT(*) FILTER (WHERE state = 'locked') as locked_count,
  COUNT(*) FILTER (WHERE state = 'consumed') as consumed_count,
  COUNT(*) FILTER (WHERE state = 'released') as released_count,
  COUNT(*) FILTER (WHERE state = 'expired') as expired_count
FROM public.escrow_locks;
```

3. **Click "Run" button**

4. **Verify the output shows:**
   ```
   status: "escrow_locks schema updated"
   total_locks: (number)
   locked_count: (number)
   consumed_count: (number)
   released_count: (number)
   expired_count: (number)
   ```

---

## Option 2: Apply via psql (if you have network access)

```bash
cd server
psql "$SUPABASE_DB_URL" -f migrations/116_fix_escrow_locks_schema.sql
```

---

## After Migration

1. **Refresh your browser** (the backend is already running with the updated code)
2. **Place a test bet** ($1-$5 on any prediction)
3. **Verify it succeeds** - you should see:
   - "Bet placed: $X | lock consumed" toast message
   - Bet appears in "My Bets" → Active tab
   - Wallet balance decreases by bet amount

---

## What This Migration Does

### Before Migration:
- `state` CHECK constraint: `('locked','released','voided')` ❌
- Code tries to use: `'consumed'` ❌
- **Result:** All bets fail with "Failed to create escrow lock"

### After Migration:
- `state` CHECK constraint: `('locked','released','voided','consumed','expired')` ✅
- Code uses: `'consumed'` ✅
- **Result:** Bets work perfectly ✅

### Lock Lifecycle:
1. **locked** - Funds reserved, bet pending (10min TTL)
2. **consumed** - Bet placed, funds in active prediction
3. **released** - Bet settled, funds returned to user
4. **voided** - Bet cancelled
5. **expired** - Lock timed out, funds freed

---

## Troubleshooting

### If migration fails:
1. Check if you have the correct permissions (service_role)
2. Try running each ALTER TABLE statement individually
3. Check for existing locks that might conflict

### If bet placement still fails after migration:
1. Check server logs: `cd server && npm run dev`
2. Look for error messages in browser console
3. Verify migration was applied: Run this query in Supabase SQL Editor:
   ```sql
   SELECT conname, pg_get_constraintdef(oid) 
   FROM pg_constraint 
   WHERE conrelid = 'public.escrow_locks'::regclass 
   AND conname LIKE '%check%';
   ```
   Should show constraints that include `'consumed'` and `'expired'`

---

## Files Modified (Already Applied)

- ✅ `server/src/routes/predictions/placeBet.ts` - Uses `'consumed'` state
- ✅ `server/src/services/walletReconciliation.ts` - Counts consumed locks
- ✅ `server/src/cron/expireLocks.ts` - Updates both state and status
- ✅ `server/src/routes/walletMaintenance.ts` - Consistent updates
- ✅ `client/src/components/PredictionCard.tsx` - Fixed timestamp display
- ✅ `client/src/pages/BetsTab.tsx` - Consistent time formatting

**Only the database schema needs to be updated now.**

