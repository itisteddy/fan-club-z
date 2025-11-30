-- ==============================================================================
-- EMERGENCY: DISABLE REFERRAL TRIGGER TO ALLOW USER SIGNUPS
-- ==============================================================================
-- RUN THIS IN SUPABASE SQL EDITOR IMMEDIATELY TO UNBLOCK USER SIGNUPS
--
-- This disables the referral code trigger that is causing "Database error saving new user"
-- ==============================================================================

-- Option 1: DISABLE the trigger (safest - can re-enable later)
ALTER TABLE users DISABLE TRIGGER trg_users_referral_code;

-- Verify it's disabled:
SELECT 
  pg_trigger.tgname as trigger_name,
  CASE pg_trigger.tgenabled 
    WHEN 'D' THEN 'DISABLED'
    WHEN 'O' THEN 'ENABLED (origin)'
    WHEN 'R' THEN 'ENABLED (replica)'
    WHEN 'A' THEN 'ENABLED (always)'
    ELSE 'ENABLED'
  END as status
FROM pg_trigger
JOIN pg_class ON pg_trigger.tgrelid = pg_class.oid
WHERE pg_class.relname = 'users' AND pg_trigger.tgname LIKE '%referral%';

-- ==============================================================================
-- AFTER USERS CAN SIGN UP, run EMERGENCY_FIX_REFERRAL_TRIGGER.sql to fix the
-- trigger function, then re-enable with:
--
-- ALTER TABLE users ENABLE TRIGGER trg_users_referral_code;
-- ==============================================================================

