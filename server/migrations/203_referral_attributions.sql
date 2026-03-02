-- Migration 203: Create referral_attributions table
-- Records when a user is successfully attributed to a referrer

CREATE TABLE IF NOT EXISTS referral_attributions (
  id bigserial PRIMARY KEY,
  referrer_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referee_user_id uuid NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,  -- UNIQUE ensures one attribution per user
  method text NOT NULL DEFAULT 'first_login',  -- Attribution method: first_login, registration, etc.
  attributed_at timestamptz NOT NULL DEFAULT now(),
  ref_code text,                    -- The referral code used
  click_id bigint NULL,             -- Link to the click that led to this attribution
  ip inet,
  device_fingerprint text,
  flags jsonb DEFAULT '{}'::jsonb   -- For anti-abuse flags: {suspicious: true, reason: "..."}
);

-- Index for counting referrals per referrer
CREATE INDEX IF NOT EXISTS idx_referral_attributions_referrer 
  ON referral_attributions(referrer_user_id, attributed_at DESC);

-- Index for checking if a user has been attributed
CREATE INDEX IF NOT EXISTS idx_referral_attributions_referee 
  ON referral_attributions(referee_user_id);

-- Index for finding attributions by ref_code
CREATE INDEX IF NOT EXISTS idx_referral_attributions_ref_code 
  ON referral_attributions(ref_code, attributed_at DESC);

-- Index for anti-abuse: suspicious attributions
CREATE INDEX IF NOT EXISTS idx_referral_attributions_flags 
  ON referral_attributions USING gin(flags);

-- Comment for documentation
COMMENT ON TABLE referral_attributions IS 'Records referral attributions when new users sign up via referral links.';
COMMENT ON COLUMN referral_attributions.method IS 'How the attribution was made: first_login, registration';
COMMENT ON COLUMN referral_attributions.flags IS 'Anti-abuse flags: {suspicious: bool, reasons: [...]}';
