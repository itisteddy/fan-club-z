-- ============================================================================
-- DELETE PREDICTIONS: "Local Quick Test" and all predictions by "Fan Club Z Admin"
-- ============================================================================
-- Run this script in Supabase SQL Editor
-- 
-- This script will:
-- 1. Find and delete the prediction titled "Local Quick Test"
-- 2. Find and delete all predictions created by the user "Fan Club Z Admin"
-- 
-- IMPORTANT: This will also delete related data (bets, options, etc.) due to
-- foreign key cascades. Review the results before running in production.
-- ============================================================================

-- First, let's see what we're about to delete (DRY RUN)
-- Run this SELECT first to verify the predictions that will be deleted:

SELECT 
  p.id,
  p.title,
  p.status,
  p.created_at,
  u.id as creator_id,
  COALESCE(u.first_name || ' ' || u.last_name, u.email) as creator_name
FROM predictions p
LEFT JOIN users u ON p.creator_id = u.id
WHERE 
  p.title = 'Local Quick Test'
  OR (u.first_name = 'Fan Club Z' AND u.last_name = 'Admin')
  OR (u.first_name || ' ' || u.last_name = 'Fan Club Z Admin')
ORDER BY p.created_at DESC;

-- ============================================================================
-- DANGER ZONE: Uncomment the lines below to actually delete the predictions
-- ============================================================================

-- Step 1: Delete predictions by title "Local Quick Test"
/*
DELETE FROM predictions
WHERE title = 'Local Quick Test';
*/

-- Step 2: Delete all predictions by "Fan Club Z Admin" user
/*
DELETE FROM predictions
WHERE creator_id IN (
  SELECT id FROM users
  WHERE 
    (first_name = 'Fan Club Z' AND last_name = 'Admin')
    OR (first_name || ' ' || last_name = 'Fan Club Z Admin')
);
*/

-- ============================================================================
-- Alternative: Single query to delete both at once
-- ============================================================================

/*
DELETE FROM predictions
WHERE 
  title = 'Local Quick Test'
  OR creator_id IN (
    SELECT id FROM users
    WHERE 
      (first_name = 'Fan Club Z' AND last_name = 'Admin')
      OR (first_name || ' ' || last_name = 'Fan Club Z Admin')
  );
*/

-- ============================================================================
-- Verify deletion (run after uncommenting and executing the DELETE)
-- ============================================================================

/*
SELECT COUNT(*) as remaining_predictions
FROM predictions p
LEFT JOIN users u ON p.creator_id = u.id
WHERE 
  p.title = 'Local Quick Test'
  OR (u.first_name = 'Fan Club Z' AND u.last_name = 'Admin')
  OR (u.first_name || ' ' || u.last_name = 'Fan Club Z Admin');
*/
