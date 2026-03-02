-- ==============================================================================
-- EMERGENCY FIX: Make referral code trigger more robust
-- ==============================================================================
-- This fixes the "Database error saving new user" issue caused by the
-- referral code trigger failing for new users
--
-- RUN THIS IN SUPABASE SQL EDITOR IMMEDIATELY
-- ==============================================================================

-- First, let's make the generate_referral_code function more robust
CREATE OR REPLACE FUNCTION generate_referral_code(p_username text, p_user_id uuid)
RETURNS text AS $$
DECLARE
  base_code text;
  final_code text;
  counter integer := 0;
BEGIN
  -- Handle NULL user_id gracefully
  IF p_user_id IS NULL THEN
    RETURN 'user' || substring(md5(random()::text), 1, 8);
  END IF;

  -- Clean username: lowercase, remove special chars, limit to 12 chars
  base_code := lower(regexp_replace(COALESCE(p_username, ''), '[^a-zA-Z0-9]', '', 'g'));
  
  -- If too short or empty, use part of UUID
  IF base_code IS NULL OR length(base_code) < 3 THEN
    base_code := 'user' || substring(p_user_id::text, 1, 6);
  END IF;
  
  -- Truncate to 12 chars
  base_code := substring(base_code, 1, 12);
  final_code := base_code;
  
  -- Ensure uniqueness by appending number if needed
  WHILE EXISTS (SELECT 1 FROM users WHERE referral_code = final_code AND id != p_user_id) LOOP
    counter := counter + 1;
    final_code := base_code || counter::text;
    
    -- Safety: if we've tried 100 times, use UUID approach
    IF counter > 100 THEN
      final_code := base_code || substring(md5(random()::text), 1, 4);
      EXIT;  -- Exit the loop
    END IF;
  END LOOP;
  
  RETURN final_code;
EXCEPTION
  WHEN OTHERS THEN
    -- On any error, return a safe random code
    RETURN 'user' || substring(md5(random()::text), 1, 8);
END;
$$ LANGUAGE plpgsql;

-- Update the trigger function to be more robust and handle errors
CREATE OR REPLACE FUNCTION trigger_generate_referral_code()
RETURNS TRIGGER AS $$
BEGIN
  -- Only generate if referral_code is NULL
  IF NEW.referral_code IS NULL THEN
    BEGIN
      -- Try to generate from username/full_name
      NEW.referral_code := generate_referral_code(
        COALESCE(NEW.username, NEW.full_name, NEW.email, ''), 
        NEW.id
      );
    EXCEPTION
      WHEN OTHERS THEN
        -- On any error, use a random code
        NEW.referral_code := 'user' || substring(md5(random()::text), 1, 8);
    END;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- ALTERNATIVE: If issues persist, DISABLE the trigger temporarily
-- ==============================================================================
-- Uncomment the line below to disable the trigger if problems continue:
-- DROP TRIGGER IF EXISTS trg_users_referral_code ON users;

-- ==============================================================================
-- VERIFICATION
-- ==============================================================================
-- Run this to verify the trigger is working:
/*
SELECT 
  pg_trigger.tgname as trigger_name,
  pg_trigger.tgenabled as enabled,
  pg_proc.proname as function_name
FROM pg_trigger
JOIN pg_proc ON pg_trigger.tgfoid = pg_proc.oid
JOIN pg_class ON pg_trigger.tgrelid = pg_class.oid
WHERE pg_class.relname = 'users' AND pg_trigger.tgname LIKE '%referral%';
*/

-- ==============================================================================
-- TEST: Try inserting a test user to verify fix works
-- ==============================================================================
-- Uncomment to test:
/*
DO $$
DECLARE
  test_id uuid := gen_random_uuid();
BEGIN
  INSERT INTO users (id, email, username)
  VALUES (test_id, 'test_fix_' || test_id || '@example.com', NULL);
  
  RAISE NOTICE 'Test insert successful! User ID: %, Referral Code: %', 
    test_id, 
    (SELECT referral_code FROM users WHERE id = test_id);
  
  -- Clean up test user
  DELETE FROM users WHERE id = test_id;
  RAISE NOTICE 'Test user cleaned up.';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Test FAILED with error: %', SQLERRM;
END $$;
*/

