-- Phase 4 follow-up: prevent fallback jump after 2026 policy window.
-- Seeds future daily-claim policy rows at floor amount (1 Zaurum/day), idempotent.
-- Safe to run multiple times.

WITH start_date AS (
  SELECT GREATEST(
    COALESCE((SELECT MAX(effective_date) + 1 FROM public.daily_claim_policy), DATE '2027-01-01'),
    DATE '2027-01-01'
  ) AS d
),
future_days AS (
  SELECT GENERATE_SERIES(
    (SELECT d FROM start_date),
    DATE '2030-12-31',
    INTERVAL '1 day'
  )::DATE AS effective_date
)
INSERT INTO public.daily_claim_policy (effective_date, amount)
SELECT effective_date, 1::NUMERIC(18,8)
FROM future_days
ON CONFLICT (effective_date) DO NOTHING;
