-- Migration 119: clarify creator earnings badge semantics as first $10 earned.
-- Existing earned badges remain permanent in user_badges.

UPDATE public.badge_definitions
SET
  title = 'First $10 Creator Earnings',
  description = 'Earn your first $10 in creator fees.',
  progress_metric = 'creator_earnings_amount',
  goal_value = 10
WHERE key = 'FIRST_CREATOR_EARNING';

