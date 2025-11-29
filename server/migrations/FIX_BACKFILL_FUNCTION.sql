-- ============================================================================
-- FIX: Update backfill function to use created_at only
-- ============================================================================
-- Run this to fix the backfill_og_badges function

CREATE OR REPLACE FUNCTION backfill_og_badges(
  gold_count integer DEFAULT 25,
  silver_count integer DEFAULT 100,
  bronze_count integer DEFAULT 500,
  p_reason text DEFAULT 'backfill:created_at'
)
RETURNS TABLE(tier text, assigned_count integer, skipped_count integer) AS $$
DECLARE
  v_tier og_badge_tier;
  v_limit integer;
  v_offset integer := 0;
  v_assigned integer;
  v_skipped integer;
BEGIN
  -- Process each tier in order
  FOR v_tier, v_limit IN 
    SELECT 'gold'::og_badge_tier, gold_count
    UNION ALL SELECT 'silver'::og_badge_tier, silver_count
    UNION ALL SELECT 'bronze'::og_badge_tier, bronze_count
  LOOP
    v_assigned := 0;
    v_skipped := 0;
    
    -- Update users without badges, ordered by created_at (earliest first)
    WITH eligible_users AS (
      SELECT id
      FROM users
      WHERE og_badge IS NULL
      ORDER BY created_at ASC
      OFFSET v_offset
      LIMIT v_limit
    )
    UPDATE users u
    SET 
      og_badge = v_tier,
      og_badge_assigned_at = now(),
      og_badge_reason = p_reason
    FROM eligible_users e
    WHERE u.id = e.id
      AND u.og_badge IS NULL;
    
    GET DIAGNOSTICS v_assigned = ROW_COUNT;
    v_skipped := v_limit - v_assigned;
    
    -- Update offset for next tier
    v_offset := v_offset + v_limit;
    
    tier := v_tier::text;
    assigned_count := v_assigned;
    skipped_count := v_skipped;
    RETURN NEXT;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Now run the backfill:
-- ============================================================================

-- Assign badges to earliest users
SELECT * FROM backfill_og_badges(25, 100, 500);

-- Calculate member numbers
SELECT * FROM backfill_og_badge_member_numbers();

-- Refresh the materialized view
SELECT refresh_referral_stats();
