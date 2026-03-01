-- Rename the First $10 Creator Earnings badge to Zaurum

UPDATE public.badge_definitions
SET 
  title = 'First 10 Zaurum Creator Earnings',
  description = 'Earn your first 10 Zaurum in creator fees.'
WHERE key = 'FIRST_CREATOR_EARNING';
