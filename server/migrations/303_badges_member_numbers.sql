-- Migration 303: Add member number tracking for OG badges
-- This allows us to show "Member #17" type displays
-- Run after 301_badges_og.sql and after backfill

-- Add column for member number within tier
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS og_badge_member_number integer NULL;

-- Create index for potential sorting by member number
CREATE INDEX IF NOT EXISTS idx_users_og_badge_member_number 
  ON users(og_badge, og_badge_member_number) 
  WHERE og_badge IS NOT NULL;

-- Function to calculate member number based on assignment order
CREATE OR REPLACE FUNCTION calculate_og_badge_member_number(p_user_id uuid)
RETURNS integer AS $$
DECLARE
  v_tier og_badge_tier;
  v_assigned_at timestamptz;
  v_number integer;
BEGIN
  -- Get user's tier and assignment date
  SELECT og_badge, og_badge_assigned_at 
  INTO v_tier, v_assigned_at
  FROM users 
  WHERE id = p_user_id;
  
  IF v_tier IS NULL OR v_assigned_at IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Count users with same tier assigned before this user (1-indexed)
  SELECT COUNT(*) + 1 INTO v_number
  FROM users
  WHERE og_badge = v_tier
    AND og_badge_assigned_at < v_assigned_at
    AND og_badge_assigned_at IS NOT NULL;
  
  RETURN v_number;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to backfill all member numbers
CREATE OR REPLACE FUNCTION backfill_og_badge_member_numbers()
RETURNS TABLE(tier text, updated_count integer) AS $$
DECLARE
  v_tier og_badge_tier;
  v_updated integer;
BEGIN
  -- Process each tier
  FOR v_tier IN SELECT unnest(enum_range(NULL::og_badge_tier)) LOOP
    WITH numbered AS (
      SELECT 
        id,
        ROW_NUMBER() OVER (
          PARTITION BY og_badge 
          ORDER BY og_badge_assigned_at ASC NULLS LAST, created_at ASC
        ) AS member_num
      FROM users
      WHERE og_badge = v_tier
    )
    UPDATE users u
    SET og_badge_member_number = numbered.member_num
    FROM numbered
    WHERE u.id = numbered.id
      AND (u.og_badge_member_number IS NULL OR u.og_badge_member_number != numbered.member_num);
    
    GET DIAGNOSTICS v_updated = ROW_COUNT;
    
    tier := v_tier::text;
    updated_count := v_updated;
    RETURN NEXT;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Run the backfill
SELECT * FROM backfill_og_badge_member_numbers();

-- Trigger to auto-assign member number when badge is assigned
CREATE OR REPLACE FUNCTION trigger_assign_og_badge_member_number()
RETURNS TRIGGER AS $$
BEGIN
  -- Only run if og_badge was just set and member_number is not already set
  IF NEW.og_badge IS NOT NULL 
     AND (OLD.og_badge IS NULL OR OLD.og_badge != NEW.og_badge)
     AND NEW.og_badge_member_number IS NULL THEN
    
    NEW.og_badge_member_number := calculate_og_badge_member_number(NEW.id);
  END IF;
  
  -- Clear member number if badge is removed
  IF NEW.og_badge IS NULL AND OLD.og_badge IS NOT NULL THEN
    NEW.og_badge_member_number := NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_og_badge_member_number ON users;
CREATE TRIGGER trg_users_og_badge_member_number
  BEFORE UPDATE ON users
  FOR EACH ROW
  WHEN (OLD.og_badge IS DISTINCT FROM NEW.og_badge)
  EXECUTE FUNCTION trigger_assign_og_badge_member_number();

-- Comment for documentation
COMMENT ON COLUMN users.og_badge_member_number IS 'Sequential number within the badge tier (e.g., #17 of Gold badge holders). Auto-calculated on assignment.';
COMMENT ON FUNCTION calculate_og_badge_member_number(uuid) IS 'Calculates member number based on assignment order within tier.';
COMMENT ON FUNCTION backfill_og_badge_member_numbers() IS 'Backfills member numbers for all existing badge holders.';
