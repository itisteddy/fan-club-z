-- Diagnostic Check: See What Tables Actually Exist
-- Run this to understand the current database state

-- ============================================
-- Check 1: Wallet/Payment Tables (CRITICAL)
-- ============================================
SELECT 
  'Wallet/Payment Tables' AS category,
  table_name,
  CASE 
    WHEN table_name IN ('wallets', 'wallet_transactions', 'escrow_locks', 'crypto_addresses', 'payment_providers')
    THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END AS status
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
-- Check 2: Referral Tables (New)
-- ============================================
SELECT 
  'Referral Tables' AS category,
  table_name,
  '✅ EXISTS' AS status
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
-- Check 3: Badge Columns in Users Table
-- ============================================
SELECT 
  'Badge/Referral Columns' AS category,
  column_name,
  data_type,
  '✅ EXISTS' AS status
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
-- Check 4: All Tables Summary
-- ============================================
SELECT 
  'All Tables Count' AS info,
  COUNT(*) AS total_tables
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE';

-- List all tables (for reference)
SELECT 
  'All Tables' AS info,
  table_name
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY table_name;

