-- Migration 201: Add referral columns to users table
-- Part of the Referral System implementation

-- Add referral tracking columns to users
ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS referral_code text UNIQUE,
  ADD COLUMN IF NOT EXISTS referred_by uuid NULL REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS first_login_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS last_login_at timestamptz NULL;

-- Create index on referral_code for fast lookups
CREATE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code) WHERE referral_code IS NOT NULL;

-- Create index on referred_by for counting referrals
CREATE INDEX IF NOT EXISTS idx_users_referred_by ON users(referred_by) WHERE referred_by IS NOT NULL;

-- Function to generate a unique referral code from username
CREATE OR REPLACE FUNCTION generate_referral_code(p_username text, p_user_id uuid)
RETURNS text AS $$
DECLARE
  base_code text;
  final_code text;
  counter integer := 0;
BEGIN
  -- Clean username: lowercase, remove special chars, limit to 12 chars
  base_code := lower(regexp_replace(COALESCE(p_username, ''), '[^a-zA-Z0-9]', '', 'g'));
  
  -- If too short or empty, use part of UUID
  IF length(base_code) < 3 THEN
    base_code := 'user' || substring(p_user_id::text, 1, 6);
  END IF;
  
  -- Truncate to 12 chars
  base_code := substring(base_code, 1, 12);
  final_code := base_code;
  
  -- Ensure uniqueness by appending number if needed
  WHILE EXISTS (SELECT 1 FROM users WHERE referral_code = final_code) LOOP
    counter := counter + 1;
    final_code := base_code || counter::text;
    
    -- Safety: if we've tried 1000 times, use UUID approach
    IF counter > 1000 THEN
      final_code := base_code || substring(md5(random()::text), 1, 4);
    END IF;
  END LOOP;
  
  RETURN final_code;
END;
$$ LANGUAGE plpgsql;

-- Backfill existing users with referral codes (only those without one)
UPDATE users 
SET referral_code = generate_referral_code(COALESCE(username, full_name), id)
WHERE referral_code IS NULL;

-- Trigger to auto-generate referral code for new users
CREATE OR REPLACE FUNCTION trigger_generate_referral_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := generate_referral_code(COALESCE(NEW.username, NEW.full_name), NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_referral_code ON users;
CREATE TRIGGER trg_users_referral_code
  BEFORE INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION trigger_generate_referral_code();

-- Comment for documentation
COMMENT ON COLUMN users.referral_code IS 'Unique referral code for sharing. Auto-generated from username.';
COMMENT ON COLUMN users.referred_by IS 'User ID of the referrer who brought this user to the platform.';
COMMENT ON COLUMN users.first_login_at IS 'Timestamp of first successful sign-in (for referral attribution).';
COMMENT ON COLUMN users.last_login_at IS 'Timestamp of most recent sign-in.';
