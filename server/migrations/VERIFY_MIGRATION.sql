-- Verify Migration 109 + 110 completed successfully
-- Run this in Supabase SQL Editor to check all changes were applied

-- Check 1: escrow_locks table exists
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'escrow_locks')
    THEN '✅ escrow_locks table exists'
    ELSE '❌ escrow_locks table missing'
  END AS check_result;

-- Check 2: escrow_locks has status column
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'escrow_locks' 
      AND column_name = 'status'
    )
    THEN '✅ escrow_locks.status column exists'
    ELSE '❌ escrow_locks.status column missing'
  END AS check_result;

-- Check 3: prediction_entries has escrow_lock_id column
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'prediction_entries' 
      AND column_name = 'escrow_lock_id'
    )
    THEN '✅ prediction_entries.escrow_lock_id column exists'
    ELSE '❌ prediction_entries.escrow_lock_id column missing'
  END AS check_result;

-- Check 4: prediction_entries has provider column
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'prediction_entries' 
      AND column_name = 'provider'
    )
    THEN '✅ prediction_entries.provider column exists'
    ELSE '❌ prediction_entries.provider column missing'
  END AS check_result;

-- Check 5: Unique constraint on escrow_lock_id consumption exists
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_indexes 
      WHERE schemaname = 'public' 
      AND tablename = 'prediction_entries' 
      AND indexname = 'uniq_lock_consumption'
    )
    THEN '✅ uniq_lock_consumption constraint exists'
    ELSE '❌ uniq_lock_consumption constraint missing'
  END AS check_result;

-- Check 6: Foreign key constraint exists
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_constraint 
      WHERE conname = 'prediction_entries_escrow_lock_id_fkey'
    )
    THEN '✅ Foreign key constraint exists'
    ELSE '❌ Foreign key constraint missing'
  END AS check_result;

-- Check 7: Demo transactions removed (should be 0 or show count)
SELECT 
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ No demo transactions found (all cleaned up)'
    ELSE CONCAT('⚠️  Found ', COUNT(*)::text, ' demo transactions - migration 110 may not have run')
  END AS check_result
FROM wallet_transactions 
WHERE provider = 'demo';

-- Summary: Show all escrow_locks columns
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'escrow_locks'
ORDER BY ordinal_position;

-- Summary: Show prediction_entries new columns
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'prediction_entries'
  AND column_name IN ('escrow_lock_id', 'provider')
ORDER BY column_name;

