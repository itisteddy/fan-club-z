-- App configuration table for runtime settings
CREATE TABLE IF NOT EXISTS public.app_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  value_type TEXT NOT NULL DEFAULT 'string', -- 'string', 'boolean', 'number', 'json'
  description TEXT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID NULL
);

-- Insert default config values
INSERT INTO public.app_config (key, value, value_type, description) VALUES
  ('maintenance_mode', 'false', 'boolean', 'Whether the platform is in maintenance mode'),
  ('maintenance_message', 'The platform is currently under maintenance. Please check back soon.', 'string', 'Message to show during maintenance'),
  ('feature_flags', '{"crypto_deposits": true, "demo_wallet": true, "referrals": true, "comments": true}', 'json', 'Feature flags for enabling/disabling features'),
  ('platform_fee_percentage', '2.5', 'number', 'Default platform fee percentage'),
  ('creator_fee_percentage', '1.0', 'number', 'Default creator fee percentage'),
  ('min_bet_amount', '1', 'number', 'Minimum bet amount in USD'),
  ('max_bet_amount', '10000', 'number', 'Maximum bet amount in USD'),
  ('default_demo_balance', '1000', 'number', 'Default demo wallet balance for new users')
ON CONFLICT (key) DO NOTHING;

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_app_config_key ON public.app_config(key);

-- Comments
COMMENT ON TABLE public.app_config IS 'Runtime configuration settings managed via admin panel';

