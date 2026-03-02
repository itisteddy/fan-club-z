-- Migration 202: Create referral_clicks table
-- Tracks all clicks on referral links for analytics

CREATE TABLE IF NOT EXISTS referral_clicks (
  id bigserial PRIMARY KEY,
  ref_code text NOT NULL,
  clicked_at timestamptz NOT NULL DEFAULT now(),
  ip inet,
  ua text,                          -- User agent string
  device_fingerprint text,          -- For anti-abuse detection
  landing_path text,                -- Where they landed (e.g., /discover)
  utm jsonb DEFAULT '{}'::jsonb,    -- UTM parameters for marketing attribution
  converted boolean DEFAULT false,   -- Did this click lead to a signup?
  converted_user_id uuid NULL       -- If converted, which user?
);

-- Index for looking up clicks by referral code
CREATE INDEX IF NOT EXISTS idx_referral_clicks_ref_code 
  ON referral_clicks(ref_code, clicked_at DESC);

-- Index for time-based queries
CREATE INDEX IF NOT EXISTS idx_referral_clicks_clicked_at 
  ON referral_clicks(clicked_at DESC);

-- Index for conversion tracking
CREATE INDEX IF NOT EXISTS idx_referral_clicks_converted 
  ON referral_clicks(converted) WHERE converted = true;

-- Index for anti-abuse: device fingerprint lookups
CREATE INDEX IF NOT EXISTS idx_referral_clicks_device 
  ON referral_clicks(device_fingerprint, clicked_at DESC) 
  WHERE device_fingerprint IS NOT NULL;

-- Index for anti-abuse: IP lookups
CREATE INDEX IF NOT EXISTS idx_referral_clicks_ip 
  ON referral_clicks(ip, clicked_at DESC) 
  WHERE ip IS NOT NULL;

-- Comment for documentation
COMMENT ON TABLE referral_clicks IS 'Tracks all clicks on referral links for analytics and attribution.';
COMMENT ON COLUMN referral_clicks.utm IS 'UTM marketing parameters: {source, medium, campaign, term, content}';
COMMENT ON COLUMN referral_clicks.device_fingerprint IS 'Browser fingerprint for anti-abuse detection.';
