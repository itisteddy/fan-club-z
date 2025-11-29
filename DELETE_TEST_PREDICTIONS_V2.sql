-- ============================================================================
-- DELETE PREDICTIONS: "Local Quick Test" and all predictions by "Fan Club Z Admin"
-- ============================================================================
-- Run this script in Supabase SQL Editor
-- ============================================================================

-- Step 1: First, let's see the structure of the users table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY ordinal_position;

-- Step 2: Let's also check the profiles table (if it exists)
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
ORDER BY ordinal_position;

-- Step 3: Find the prediction titled "Local Quick Test"
SELECT id, title, status, created_at, creator_id
FROM predictions
WHERE title = 'Local Quick Test';

-- Step 4: Find all users to see their structure and find "Fan Club Z Admin"
SELECT * FROM users LIMIT 10;

-- Step 5: Check profiles table for the admin user
SELECT * FROM profiles WHERE display_name ILIKE '%admin%' OR display_name ILIKE '%fan club%';

-- ============================================================================
-- Once you identify the correct column names, use one of these DELETE queries:
-- ============================================================================

-- Option A: Delete by prediction title only
/*
DELETE FROM predictions
WHERE title = 'Local Quick Test';
*/

-- Option B: Delete by creator_id (replace 'ADMIN_USER_ID' with actual UUID)
/*
DELETE FROM predictions
WHERE creator_id = 'ADMIN_USER_ID';
*/

-- Option C: Delete both (replace 'ADMIN_USER_ID' with actual UUID)
/*
DELETE FROM predictions
WHERE title = 'Local Quick Test'
   OR creator_id = 'ADMIN_USER_ID';
*/
