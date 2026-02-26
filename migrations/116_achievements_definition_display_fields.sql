-- Item 3 follow-up: visual achievements tiles need stable ordering + curated badge set metadata.
-- Additive migration; safe before app changes.

ALTER TABLE public.award_definitions
  ADD COLUMN IF NOT EXISTS sort_order INTEGER;

ALTER TABLE public.badge_definitions
  ADD COLUMN IF NOT EXISTS sort_order INTEGER,
  ADD COLUMN IF NOT EXISTS is_key BOOLEAN NOT NULL DEFAULT TRUE;

UPDATE public.award_definitions
SET sort_order = CASE key
  WHEN 'TOP_CREATOR' THEN 10
  WHEN 'TOP_WINNERS' THEN 20
  WHEN 'TOP_PROFITERS' THEN 30
  WHEN 'TOP_COMMENTER' THEN 40
  WHEN 'TOP_PARTICIPANTS' THEN 50
  ELSE COALESCE(sort_order, 999)
END
WHERE sort_order IS NULL
   OR sort_order = 999;

UPDATE public.badge_definitions
SET sort_order = CASE key
  WHEN 'FIRST_STAKE' THEN 10
  WHEN 'TEN_STAKES' THEN 20
  WHEN 'FIRST_COMMENT' THEN 30
  WHEN 'FIRST_CREATOR_EARNING' THEN 40
  ELSE COALESCE(sort_order, 999)
END,
is_key = COALESCE(is_key, TRUE)
WHERE sort_order IS NULL
   OR sort_order = 999
   OR is_key IS NULL;

