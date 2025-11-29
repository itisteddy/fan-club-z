# 📊 Phase 2: Database Migrations

**Status:** Ready to Execute  
**Risk Level:** LOW (additive only, no wallet/payment table modifications)  
**Estimated Time:** 15-20 minutes

---

## 🎯 Objective

Run all database migrations for badges and referrals system. These migrations are **additive only** - they create new tables and columns but **do not modify** any existing wallet or payment tables.

---

## ✅ Pre-Migration Checklist

- [x] Phase 1 complete (recovery point created)
- [ ] Supabase SQL Editor access ready
- [ ] Database backup (optional but recommended)

---

## 📋 Migration Files (Run in Order)

### Referral System Migrations

#### 1. `201_users_referrals.sql`
**Purpose:** Adds referral code column to users table  
**Risk:** LOW - Only adds column, no data modification

#### 2. `202_referral_clicks.sql`
**Purpose:** Creates referral_clicks table for tracking link clicks  
**Risk:** LOW - New table only

#### 3. `203_referral_attributions.sql`
**Purpose:** Creates referral_attributions table for signup tracking  
**Risk:** LOW - New table only

#### 4. `204_auth_logins.sql`
**Purpose:** Creates auth_logins table for login tracking  
**Risk:** LOW - New table only

#### 5. `205_referral_stats_mv.sql`
**Purpose:** Creates materialized view for referral statistics  
**Risk:** LOW - Read-only view

#### 6. `206_referral_stats_mv_v2.sql`
**Purpose:** Enhanced referral stats view (replaces 205)  
**Risk:** LOW - Drops and recreates view (no data loss)

### Badge System Migrations

#### 7. `301_badges_og.sql`
**Purpose:** Adds OG badge columns to users table  
**Risk:** LOW - Only adds columns, no data modification

#### 8. `302_badges_admin_views.sql`
**Purpose:** Creates admin views and functions for badge management  
**Risk:** LOW - Views and functions only

#### 9. `303_badges_member_numbers.sql`
**Purpose:** Adds member number tracking for badges  
**Risk:** LOW - Only adds column and functions

---

## 🚀 Execution Steps

### Step 1: Open Supabase SQL Editor

1. Go to your Supabase Dashboard
2. Navigate to: **SQL Editor** → **New Query**
3. Keep this tab open for all migrations

### Step 2: Run Migrations One by One

**IMPORTANT:** Run each migration file **individually** and verify success before proceeding to the next.

#### Migration 1: Referral Code Column
```sql
-- Copy contents of: server/migrations/201_users_referrals.sql
-- Paste and execute in Supabase SQL Editor
-- Verify: Should see "Success. No rows returned"
```

#### Migration 2: Referral Clicks Table
```sql
-- Copy contents of: server/migrations/202_referral_clicks.sql
-- Paste and execute in Supabase SQL Editor
-- Verify: Should see "Success. No rows returned"
```

#### Migration 3: Referral Attributions Table
```sql
-- Copy contents of: server/migrations/203_referral_attributions.sql
-- Paste and execute in Supabase SQL Editor
-- Verify: Should see "Success. No rows returned"
```

#### Migration 4: Auth Logins Table
```sql
-- Copy contents of: server/migrations/204_auth_logins.sql
-- Paste and execute in Supabase SQL Editor
-- Verify: Should see "Success. No rows returned"
```

#### Migration 5: Referral Stats View (Initial)
```sql
-- Copy contents of: server/migrations/205_referral_stats_mv.sql
-- Paste and execute in Supabase SQL Editor
-- Verify: Should see "Success. No rows returned"
```

#### Migration 6: Referral Stats View (Enhanced - Replaces 205)
```sql
-- Copy contents of: server/migrations/206_referral_stats_mv_v2.sql
-- Paste and execute in Supabase SQL Editor
-- Note: This will DROP and recreate the view from migration 205
-- Verify: Should see "Success. No rows returned"
```

#### Migration 7: OG Badge Columns
```sql
-- Copy contents of: server/migrations/301_badges_og.sql
-- Paste and execute in Supabase SQL Editor
-- Verify: Should see "Success. No rows returned"
```

#### Migration 8: Badge Admin Views
```sql
-- Copy contents of: server/migrations/302_badges_admin_views.sql
-- Paste and execute in Supabase SQL Editor
-- Verify: Should see "Success. No rows returned"
```

#### Migration 9: Badge Member Numbers
```sql
-- Copy contents of: server/migrations/303_badges_member_numbers.sql
-- Paste and execute in Supabase SQL Editor
-- Verify: Should see "Success. No rows returned"
```

---

## ✅ Verification Queries

After running all migrations, execute these queries to verify success:

### Check Referral Tables
```sql
-- Should return 4 rows
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'users_referrals', 
  'referral_clicks', 
  'referral_attributions', 
  'auth_logins'
)
ORDER BY table_name;
```

### Check Referral Materialized View
```sql
-- Should return 1 row
SELECT matviewname 
FROM pg_matviews 
WHERE schemaname = 'public' 
AND matviewname = 'referral_stats_mv';
```

### Check Badge Columns in Users Table
```sql
-- Should return 3 rows
SELECT column_name 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'users' 
AND column_name IN (
  'og_badge', 
  'og_badge_assigned_at', 
  'og_badge_member_number',
  'referral_code'
)
ORDER BY column_name;
```

### Check Badge Functions
```sql
-- Should return multiple rows (functions exist)
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE '%badge%'
ORDER BY routine_name;
```

### Check Referral Functions
```sql
-- Should return multiple rows (functions exist)
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE '%referral%'
ORDER BY routine_name;
```

---

## 🚨 Troubleshooting

### Error: "relation already exists"
**Cause:** Migration already run  
**Solution:** Skip this migration, continue with next

### Error: "column already exists"
**Cause:** Column already added  
**Solution:** Migration uses `IF NOT EXISTS`, but if error occurs, skip and continue

### Error: "permission denied"
**Cause:** Insufficient database permissions  
**Solution:** Ensure you're using service role key or have admin access

### Error: "syntax error"
**Cause:** Copy/paste issue or SQL syntax error  
**Solution:** 
1. Check the migration file for complete SQL
2. Ensure no partial copy/paste
3. Try running the migration file directly

---

## 📝 Migration Log Template

Use this to track your progress:

```
Phase 2: Database Migrations
Date: _______________
Time Started: _______________

[ ] 201_users_referrals.sql - Completed at: _______
[ ] 202_referral_clicks.sql - Completed at: _______
[ ] 203_referral_attributions.sql - Completed at: _______
[ ] 204_auth_logins.sql - Completed at: _______
[ ] 205_referral_stats_mv.sql - Completed at: _______
[ ] 206_referral_stats_mv_v2.sql - Completed at: _______
[ ] 301_badges_og.sql - Completed at: _______
[ ] 302_badges_admin_views.sql - Completed at: _______
[ ] 303_badges_member_numbers.sql - Completed at: _______

Verification:
[ ] Referral tables exist (4 tables)
[ ] Referral materialized view exists
[ ] Badge columns exist in users table (4 columns)
[ ] Badge functions exist
[ ] Referral functions exist

Time Completed: _______________
Status: ✅ Complete / ⚠️ Issues (describe below)
```

---

## ⚠️ Important Notes

1. **Run migrations in order** - Some migrations depend on previous ones
2. **Verify each migration** - Don't proceed if a migration fails
3. **No wallet/payment impact** - These migrations don't touch wallet or payment tables
4. **Can be rolled back** - If needed, we can drop the new tables/columns (but not necessary if feature flags are OFF)
5. **Feature flags still OFF** - Even after migrations, features remain disabled until Phase 4

---

## ✅ Success Criteria

Phase 2 is successful when:
- [x] All 9 migrations executed without errors
- [x] All verification queries return expected results
- [x] No errors in Supabase logs
- [x] Wallet/payment tables remain unchanged (verify with: `SELECT * FROM wallets LIMIT 1;`)

---

## 🎯 Next Steps

After Phase 2 completion:
- ✅ Database schema ready for badges/referrals
- ✅ Proceed to Phase 3: Backend Deployment
- ✅ Features still disabled (safe state)

---

**Created:** January 28, 2025  
**Status:** Ready for Execution

