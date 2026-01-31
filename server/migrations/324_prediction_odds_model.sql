-- Odds V2: add odds_model to predictions (legacy vs pool_v2).
-- Default NULL = legacy (existing behavior). New predictions can set 'pool_v2' when FLAG_ODDS_V2 on.

-- Default NULL so existing rows stay legacy; application sets 'legacy' or 'pool_v2' on create
ALTER TABLE public.predictions
  ADD COLUMN IF NOT EXISTS odds_model TEXT;

COMMENT ON COLUMN public.predictions.odds_model IS 'Odds/payout model: legacy (current) or pool_v2 (pool-based, fee from losing pool). Default legacy for backward compatibility.';

-- Optional: constrain to known values (Supabase/Postgres allow CHECK)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'predictions_odds_model_check'
  ) THEN
    ALTER TABLE public.predictions
      ADD CONSTRAINT predictions_odds_model_check
      CHECK (odds_model IS NULL OR odds_model IN ('legacy', 'pool_v2'));
  END IF;
END $$;
