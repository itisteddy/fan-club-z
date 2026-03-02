-- Create event_log table for audit trail and webhook processing
CREATE TABLE IF NOT EXISTS public.event_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,
  kind text NOT NULL,
  ref text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  ts timestamptz NOT NULL DEFAULT now()
);

-- Create index for efficient time-based queries
CREATE INDEX IF NOT EXISTS idx_event_log_ts ON public.event_log (ts DESC);
