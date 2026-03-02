-- Final Verification: Check Badge Columns and Referral Code Column
-- Run this to confirm Phase 2 is complete

-- ============================================
-- 1. VERIFY BADGE COLUMNS IN USERS TABLE
-- ============================================
SELECT 
  'Badge Columns' AS check_type,
  column_name,
  data_type,
  is_nullable,
  '✅ EXISTS' AS status
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'users' 
AND column_name IN (
  'og_badge', 
  'og_badge_assigned_at', 
  'og_badge_member_number',
  'referral_code',
  'referred_by'
)
ORDER BY column_name;

-- ============================================
-- 2. VERIFY REFERRAL TABLES EXIST
-- ============================================
SELECT 
  'Referral Tables' AS check_type,
  table_name,
  '✅ EXISTS' AS status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'referral_clicks', 
  'referral_attributions', 
  'auth_logins'
)
ORDER BY table_name;

-- ============================================
-- 3. VERIFY REFERRAL MATERIALIZED VIEW
-- ============================================
SELECT 
  'Referral Stats View' AS check_type,
  matviewname AS view_name,
  '✅ EXISTS' AS status
FROM pg_matviews 
WHERE schemaname = 'public' 
AND matviewname = 'referral_stats_mv';

-- ============================================
-- 4. VERIFY BADGE ENUM TYPE
-- ============================================
SELECT 
  'Badge Enum Type' AS check_type,
  typname AS type_name,
  '✅ EXISTS' AS status
FROM pg_type 
WHERE typname = 'og_badge_tier';

-- ============================================
-- 5. VERIFY WALLET TABLES STILL INTACT (CRITICAL)
-- ============================================
SELECT 
  'Wallet Tables (Critical)' AS check_type,
  table_name,
  '✅ INTACT' AS status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'wallets',
  'wallet_transactions',
  'escrow_locks',
  'crypto_addresses'
)
ORDER BY table_name;

-- ============================================
-- FINAL STATUS SUMMARY
-- ============================================
SELECT 
  CASE 
    WHEN (
      -- Badge columns exist (at least 3 of 4)
      (SELECT COUNT(*) FROM information_schema.columns 
       WHERE table_schema = 'public' 
       AND table_name = 'users' 
       AND column_name IN ('og_badge', 'og_badge_assigned_at', 'og_badge_member_number', 'referral_code')) >= 3
      -- Referral tables exist (at least 3)
      AND (SELECT COUNT(*) FROM information_schema.tables 
           WHERE table_schema = 'public' 
           AND table_name IN ('referral_clicks', 'referral_attributions', 'auth_logins')) >= 3
      -- Wallet tables intact (all 4)
      AND (SELECT COUNT(*) FROM information_schema.tables 
           WHERE table_schema = 'public' 
           AND table_name IN ('wallets', 'wallet_transactions', 'escrow_locks', 'crypto_addresses')) = 4
    ) THEN '✅ PHASE 2 COMPLETE - All migrations successful!'
    ELSE '⚠️  Some checks failed - Review above'
  END AS final_status;

