-- Migration 302: OG Badge Admin Views and Backfill Function
-- Supports badge assignment, summary, and backfill operations

-- Drop existing view if present (for idempotency)
DROP VIEW IF EXISTS og_badge_summary;

-- Create summary view for badge distribution
CREATE OR REPLACE VIEW og_badge_summary AS
SELECT 
  og_badge AS tier,
  count(*) AS holders,
  min(og_badge_assigned_at) AS first_assigned,
  max(og_badge_assigned_at) AS last_assigned
FROM users
WHERE og_badge IS NOT NULL
GROUP BY og_badge;

-- Grant select on view
-- Note: Adjust roles as needed for your setup
-- GRANT SELECT ON og_badge_summary TO anon, authenticated;

-- Backfill function: assigns OG badges to earliest verified users
CREATE OR REPLACE FUNCTION backfill_og_badges(
  gold_count integer DEFAULT 25,
  silver_count integer DEFAULT 100,
  bronze_count integer DEFAULT 500,
  p_reason text DEFAULT 'backfill:created_at'
)
RETURNS TABLE(tier text, assigned_count integer, skipped_count integer) AS $$
DECLARE
  v_gold_assigned integer := 0;
  v_gold_skipped integer := 0;
  v_silver_assigned integer := 0;
  v_silver_skipped integer := 0;
  v_bronze_assigned integer := 0;
  v_bronze_skipped integer := 0;
  v_user record;
  v_rank integer := 0;
BEGIN
  -- Iterate through earliest users by email confirmation or created_at
  FOR v_user IN
    SELECT id, og_badge
    FROM users
    WHERE email IS NOT NULL OR id IS NOT NULL
    ORDER BY COALESCE(email_confirmed_at, created_at) ASC NULLS LAST
    LIMIT (gold_count + silver_count + bronze_count)
  LOOP
    v_rank := v_rank + 1;
    
    -- Determine tier based on rank
    IF v_rank <= gold_count THEN
      IF v_user.og_badge IS NULL THEN
        UPDATE users SET 
          og_badge = 'gold',
          og_badge_assigned_at = now(),
          og_badge_reason = p_reason
        WHERE id = v_user.id;
        v_gold_assigned := v_gold_assigned + 1;
      ELSE
        v_gold_skipped := v_gold_skipped + 1;
      END IF;
      
    ELSIF v_rank <= gold_count + silver_count THEN
      IF v_user.og_badge IS NULL THEN
        UPDATE users SET 
          og_badge = 'silver',
          og_badge_assigned_at = now(),
          og_badge_reason = p_reason
        WHERE id = v_user.id;
        v_silver_assigned := v_silver_assigned + 1;
      ELSE
        v_silver_skipped := v_silver_skipped + 1;
      END IF;
      
    ELSE
      IF v_user.og_badge IS NULL THEN
        UPDATE users SET 
          og_badge = 'bronze',
          og_badge_assigned_at = now(),
          og_badge_reason = p_reason
        WHERE id = v_user.id;
        v_bronze_assigned := v_bronze_assigned + 1;
      ELSE
        v_bronze_skipped := v_bronze_skipped + 1;
      END IF;
    END IF;
  END LOOP;
  
  -- Return results
  tier := 'gold'; assigned_count := v_gold_assigned; skipped_count := v_gold_skipped;
  RETURN NEXT;
  tier := 'silver'; assigned_count := v_silver_assigned; skipped_count := v_silver_skipped;
  RETURN NEXT;
  tier := 'bronze'; assigned_count := v_bronze_assigned; skipped_count := v_bronze_skipped;
  RETURN NEXT;
  
  RETURN;
END;
$$ LANGUAGE plpgsql;

-- Comment for documentation
COMMENT ON VIEW og_badge_summary IS 'Summary view showing badge distribution by tier';
COMMENT ON FUNCTION backfill_og_badges IS 'Assigns OG badges to earliest verified users based on rank. Idempotent - skips users who already have badges.';
