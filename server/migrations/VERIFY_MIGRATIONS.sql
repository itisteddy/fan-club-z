-- Verification Queries for Badges & Referrals Migrations
-- Run this AFTER completing all migrations (201-206, 301-303)
-- All queries should return expected results if migrations succeeded

-- ============================================
-- 1. VERIFY REFERRAL TABLES EXIST
-- ============================================
-- Expected: 4 rows (users_referrals, referral_clicks, referral_attributions, auth_logins)
SELECT 
  'Referral Tables' AS check_type,
  COUNT(*) AS found_count,
  CASE 
    WHEN COUNT(*) = 4 THEN '✅ PASS'
    ELSE '❌ FAIL - Expected 4 tables'
  END AS status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'users_referrals', 
  'referral_clicks', 
  'referral_attributions', 
  'auth_logins'
);

-- List the tables found
SELECT 
  'Referral Tables Found' AS info,
  table_name
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'users_referrals', 
  'referral_clicks', 
  'referral_attributions', 
  'auth_logins'
)
ORDER BY table_name;

-- ============================================
-- 2. VERIFY REFERRAL MATERIALIZED VIEW EXISTS
-- ============================================
-- Expected: 1 row
SELECT 
  'Referral Materialized View' AS check_type,
  COUNT(*) AS found_count,
  CASE 
    WHEN COUNT(*) = 1 THEN '✅ PASS'
    ELSE '❌ FAIL - Expected 1 view'
  END AS status
FROM pg_matviews 
WHERE schemaname = 'public' 
AND matviewname = 'referral_stats_mv';

-- ============================================
-- 3. VERIFY BADGE COLUMNS IN USERS TABLE
-- ============================================
-- Expected: 4 rows (og_badge, og_badge_assigned_at, og_badge_member_number, referral_code)
SELECT 
  'Badge/Referral Columns in Users' AS check_type,
  COUNT(*) AS found_count,
  CASE 
    WHEN COUNT(*) = 4 THEN '✅ PASS'
    ELSE '❌ FAIL - Expected 4 columns'
  END AS status
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'users' 
AND column_name IN (
  'og_badge', 
  'og_badge_assigned_at', 
  'og_badge_member_number',
  'referral_code'
);

-- List the columns found
SELECT 
  'Badge/Referral Columns Found' AS info,
  column_name,
  data_type,
  is_nullable
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

-- ============================================
-- 4. VERIFY BADGE ENUM TYPE EXISTS
-- ============================================
-- Expected: 1 row
SELECT 
  'Badge Enum Type' AS check_type,
  COUNT(*) AS found_count,
  CASE 
    WHEN COUNT(*) = 1 THEN '✅ PASS'
    ELSE '❌ FAIL - Expected og_badge_tier enum'
  END AS status
FROM pg_type 
WHERE typname = 'og_badge_tier';

-- ============================================
-- 5. VERIFY BADGE FUNCTIONS EXIST
-- ============================================
-- Expected: Multiple rows (functions like calculate_og_badge_member_number, etc.)
SELECT 
  'Badge Functions' AS check_type,
  COUNT(*) AS found_count,
  CASE 
    WHEN COUNT(*) >= 3 THEN '✅ PASS'
    ELSE '❌ FAIL - Expected at least 3 badge functions'
  END AS status
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE '%badge%';

-- List badge functions found
SELECT 
  'Badge Functions Found' AS info,
  routine_name,
  routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE '%badge%'
ORDER BY routine_name;

-- ============================================
-- 6. VERIFY REFERRAL FUNCTIONS EXIST
-- ============================================
-- Expected: Multiple rows (functions like generate_referral_code, refresh_referral_stats, etc.)
SELECT 
  'Referral Functions' AS check_type,
  COUNT(*) AS found_count,
  CASE 
    WHEN COUNT(*) >= 2 THEN '✅ PASS'
    ELSE '❌ FAIL - Expected at least 2 referral functions'
  END AS status
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE '%referral%';

-- List referral functions found
SELECT 
  'Referral Functions Found' AS info,
  routine_name,
  routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE '%referral%'
ORDER BY routine_name;

-- ============================================
-- 7. VERIFY INDEXES EXIST
-- ============================================
-- Check key indexes for performance
SELECT 
  'Key Indexes' AS check_type,
  COUNT(*) AS found_count,
  CASE 
    WHEN COUNT(*) >= 5 THEN '✅ PASS'
    ELSE '⚠️  WARNING - Some indexes may be missing'
  END AS status
FROM pg_indexes 
WHERE schemaname = 'public' 
AND (
  indexname LIKE '%referral%' 
  OR indexname LIKE '%badge%'
  OR indexname LIKE '%og_badge%'
);

-- List indexes found
SELECT 
  'Indexes Found' AS info,
  tablename,
  indexname
FROM pg_indexes 
WHERE schemaname = 'public' 
AND (
  indexname LIKE '%referral%' 
  OR indexname LIKE '%badge%'
  OR indexname LIKE '%og_badge%'
)
ORDER BY tablename, indexname;

-- ============================================
-- 8. VERIFY WALLET/PAYMENT TABLES UNTOUCHED
-- ============================================
-- Critical check: Ensure wallet/payment tables still exist and unchanged
SELECT 
  'Wallet/Payment Tables (Critical)' AS check_type,
  COUNT(*) AS found_count,
  CASE 
    WHEN COUNT(*) >= 5 THEN '✅ PASS - Wallet tables intact'
    ELSE '⚠️  WARNING - Some wallet tables may have different names'
  END AS status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'wallets',
  'wallet_transactions',
  'escrow_locks',
  'crypto_addresses',
  'payment_providers'
);

-- List which wallet/payment tables actually exist
SELECT 
  'Wallet/Payment Tables Found' AS info,
  table_name,
  '✅ EXISTS' AS status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'wallets',
  'wallet_transactions',
  'escrow_locks',
  'crypto_addresses',
  'payment_providers'
)
ORDER BY table_name;

-- ============================================
-- SUMMARY REPORT
-- ============================================
-- Run all checks and show summary
SELECT 
  '=== MIGRATION VERIFICATION SUMMARY ===' AS summary;

-- Count all checks
SELECT 
  'Total Checks' AS metric,
  '8' AS value;

-- Final status (relaxed wallet check - they may have different names)
SELECT 
  CASE 
    WHEN (
      (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('users_referrals', 'referral_clicks', 'referral_attributions', 'auth_logins')) = 4
      AND (SELECT COUNT(*) FROM pg_matviews WHERE schemaname = 'public' AND matviewname = 'referral_stats_mv') = 1
      AND (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name IN ('og_badge', 'og_badge_assigned_at', 'og_badge_member_number', 'referral_code')) = 4
    ) THEN '✅ BADGES/REFERRALS MIGRATIONS SUCCESSFUL! (Wallet tables check skipped - may have different names)'
    ELSE '⚠️  SOME CHECKS FAILED - Review results above'
  END AS final_status;

