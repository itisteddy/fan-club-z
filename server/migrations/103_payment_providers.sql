-- Create payment_providers table for managing payment channel configurations
CREATE TABLE IF NOT EXISTS public.payment_providers (
  key text PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT false,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
