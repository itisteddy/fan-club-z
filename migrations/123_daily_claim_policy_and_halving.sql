-- Phase 4: Daily claim policy + deterministic halving schedule (America/New_York)
-- Baseline S is currently 50/day (from server/src/routes/demoWallet.ts default).
-- Schedule: start halving on 2026-03-15, reach floor 1 by 2026-06-30, keep 1 thereafter.

CREATE TABLE IF NOT EXISTS public.daily_claim_policy (
  effective_date DATE PRIMARY KEY,
  amount NUMERIC(18,8) NOT NULL CHECK (amount >= 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

WITH cfg AS (
  SELECT
    50::NUMERIC(18,8) AS start_amount,
    DATE '2026-03-15' AS start_date,
    DATE '2026-06-30' AS floor_date,
    DATE '2026-12-31' AS end_date
),
steps AS (
  SELECT
    start_amount,
    start_date,
    floor_date,
    end_date,
    CEIL(LOG(2::NUMERIC, start_amount))::INT AS halving_steps,
    GREATEST(1, FLOOR((floor_date - start_date)::NUMERIC / CEIL(LOG(2::NUMERIC, start_amount))::NUMERIC)::INT) AS step_interval_days
  FROM cfg
),
days AS (
  SELECT
    GENERATE_SERIES(DATE '2026-03-14', (SELECT end_date FROM cfg), INTERVAL '1 day')::DATE AS effective_date
),
policy AS (
  SELECT
    d.effective_date,
    CASE
      WHEN d.effective_date < s.start_date THEN s.start_amount
      ELSE GREATEST(
        1::NUMERIC,
        FLOOR(
          s.start_amount /
          POWER(
            2::NUMERIC,
            LEAST(
              s.halving_steps,
              FLOOR(((d.effective_date - s.start_date)::NUMERIC / s.step_interval_days::NUMERIC))::INT
            )
          )
        )
      )
    END AS amount
  FROM days d
  CROSS JOIN steps s
)
INSERT INTO public.daily_claim_policy (effective_date, amount)
SELECT effective_date, amount
FROM policy
ON CONFLICT (effective_date) DO UPDATE
SET amount = EXCLUDED.amount;
