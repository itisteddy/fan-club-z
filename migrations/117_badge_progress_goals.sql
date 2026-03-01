-- Item 3 follow-up: data-backed badge goals so thresholds can evolve while earned badges remain permanent.
-- Additive migration; safe before app changes.

ALTER TABLE public.badge_definitions
  ADD COLUMN IF NOT EXISTS progress_metric TEXT,
  ADD COLUMN IF NOT EXISTS goal_value NUMERIC(18,8);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'badge_definitions_progress_metric_check'
  ) THEN
    ALTER TABLE public.badge_definitions
      ADD CONSTRAINT badge_definitions_progress_metric_check
      CHECK (
        progress_metric IS NULL OR progress_metric IN (
          'stakes_count',
          'comments_count',
          'creator_earnings_amount'
        )
      ) NOT VALID;
  END IF;
END $$;

-- Existing earned badges remain permanent in user_badges.
-- Updating thresholds here affects future earners / progress display.
UPDATE public.badge_definitions
SET
  title = CASE key
    WHEN 'FIRST_COMMENT' THEN '100 Comments'
    WHEN 'FIRST_CREATOR_EARNING' THEN 'First $10 Creator Earnings'
    ELSE title
  END,
  description = CASE key
    WHEN 'FIRST_COMMENT' THEN 'Posted 100 comments on Fan Club Z.'
    WHEN 'FIRST_CREATOR_EARNING' THEN 'Earn your first $10 in creator fees.'
    ELSE description
  END,
  progress_metric = CASE key
    WHEN 'FIRST_STAKE' THEN 'stakes_count'
    WHEN 'TEN_STAKES' THEN 'stakes_count'
    WHEN 'FIRST_COMMENT' THEN 'comments_count'
    WHEN 'FIRST_CREATOR_EARNING' THEN 'creator_earnings_amount'
    ELSE progress_metric
  END,
  goal_value = CASE key
    WHEN 'FIRST_STAKE' THEN 1
    WHEN 'TEN_STAKES' THEN 10
    WHEN 'FIRST_COMMENT' THEN 100
    WHEN 'FIRST_CREATOR_EARNING' THEN 10
    ELSE goal_value
  END
WHERE key IN ('FIRST_STAKE', 'TEN_STAKES', 'FIRST_COMMENT', 'FIRST_CREATOR_EARNING');
