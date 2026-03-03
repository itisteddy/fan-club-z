-- Base schema for fresh Supabase projects (e.g. staging).
-- Creates public.users, wallets, wallet_transactions, predictions, prediction_options, prediction_entries
-- so that migrations 101+ can run. Run this once before other migrations.

-- Enable extensions if needed
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. public.users (synced from auth.users; Supabase Auth creates auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  username text,
  full_name text,
  avatar_url text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_verified boolean DEFAULT false;

-- Enum for OG badges (required by 206 before 301 runs)
DO $$ BEGIN
  CREATE TYPE og_badge_tier AS ENUM ('gold', 'silver', 'bronze');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS og_badge og_badge_tier NULL;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS og_badge_member_number integer NULL;

-- Trigger to sync new auth users into public.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, username, full_name, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'username', NEW.raw_user_meta_data->>'name'),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS so trigger insert succeeds (avoid "Database error saving new user")
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can insert own row on signup" ON public.users;
CREATE POLICY "Users can insert own row on signup" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "Authenticated can read users" ON public.users;
CREATE POLICY "Authenticated can read users" ON public.users FOR SELECT USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');
DROP POLICY IF EXISTS "Users can update own row" ON public.users;
CREATE POLICY "Users can update own row" ON public.users FOR UPDATE USING (auth.uid() = id);

-- 2. public.wallets
CREATE TABLE IF NOT EXISTS public.wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  currency varchar DEFAULT 'USD',
  available_balance numeric DEFAULT 0,
  reserved_balance numeric DEFAULT 0,
  escrow_reserved numeric DEFAULT 0,
  total_deposited numeric DEFAULT 0,
  total_withdrawn numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (user_id, currency)
);

CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON public.wallets(user_id);

-- 3. public.wallet_transactions (minimal; 102/110 add constraints)
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  amount numeric NOT NULL,
  currency text DEFAULT 'USD',
  channel text,
  provider text,
  external_ref text,
  meta jsonb DEFAULT '{}'::jsonb,
  status text DEFAULT 'completed',
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_wallet_tx_user_created ON public.wallet_transactions(user_id, created_at DESC);

-- 4. public.predictions
CREATE TABLE IF NOT EXISTS public.predictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);
ALTER TABLE public.predictions ADD COLUMN IF NOT EXISTS entry_deadline timestamptz NULL;

CREATE INDEX IF NOT EXISTS idx_predictions_creator ON public.predictions(creator_id);
CREATE INDEX IF NOT EXISTS idx_predictions_status ON public.predictions(status);
CREATE INDEX IF NOT EXISTS idx_predictions_created ON public.predictions(created_at DESC);

-- 5. public.prediction_options
CREATE TABLE IF NOT EXISTS public.prediction_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prediction_id uuid NOT NULL REFERENCES public.predictions(id) ON DELETE CASCADE,
  label text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_prediction_options_prediction ON public.prediction_options(prediction_id);

-- 6. public.prediction_entries (user stakes)
CREATE TABLE IF NOT EXISTS public.prediction_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  prediction_id uuid NOT NULL REFERENCES public.predictions(id) ON DELETE CASCADE,
  option_id uuid NOT NULL REFERENCES public.prediction_options(id) ON DELETE CASCADE,
  amount numeric NOT NULL CHECK (amount > 0),
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_prediction_entries_user ON public.prediction_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_prediction_entries_prediction ON public.prediction_entries(prediction_id);

-- 7. public.comments (UGC; 327/333 alter this)
CREATE TABLE IF NOT EXISTS public.comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  prediction_id uuid NOT NULL REFERENCES public.predictions(id) ON DELETE CASCADE,
  parent_comment_id uuid REFERENCES public.comments(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_comments_prediction ON public.comments(prediction_id);
CREATE INDEX IF NOT EXISTS idx_comments_user ON public.comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON public.comments(parent_comment_id);

COMMENT ON TABLE public.users IS 'Mirror of auth.users for app use; synced via trigger.';
COMMENT ON TABLE public.wallets IS 'User wallet balances per currency.';
COMMENT ON TABLE public.wallet_transactions IS 'Ledger of wallet movements.';
COMMENT ON TABLE public.predictions IS 'Prediction markets.';
COMMENT ON TABLE public.prediction_options IS 'Options per prediction.';
COMMENT ON TABLE public.prediction_entries IS 'User stakes on options.';
COMMENT ON TABLE public.comments IS 'User comments on predictions (UGC).';
