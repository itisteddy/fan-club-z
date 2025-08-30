-- Create settlement_validations table
CREATE TABLE IF NOT EXISTS settlement_validations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  prediction_id UUID NOT NULL REFERENCES predictions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action VARCHAR(20) NOT NULL CHECK (action IN ('accept', 'dispute')),
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(prediction_id, user_id)
);

-- Create bet_settlements table if it doesn't exist
CREATE TABLE IF NOT EXISTS bet_settlements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bet_id UUID NOT NULL REFERENCES predictions(id) ON DELETE CASCADE,
  winning_option_id UUID REFERENCES prediction_options(id),
  total_payout DECIMAL(18,8) NOT NULL DEFAULT 0,
  platform_fee_collected DECIMAL(18,8) NOT NULL DEFAULT 0,
  creator_payout_amount DECIMAL(18,8) NOT NULL DEFAULT 0,
  settlement_time TIMESTAMPTZ DEFAULT NOW(),
  proof_url TEXT,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(bet_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_settlement_validations_prediction_id ON settlement_validations(prediction_id);
CREATE INDEX IF NOT EXISTS idx_settlement_validations_user_id ON settlement_validations(user_id);
CREATE INDEX IF NOT EXISTS idx_bet_settlements_bet_id ON bet_settlements(bet_id);
CREATE INDEX IF NOT EXISTS idx_bet_settlements_winning_option_id ON bet_settlements(winning_option_id);

-- Update prediction entries table to support more status values if needed
ALTER TABLE prediction_entries 
DROP CONSTRAINT IF EXISTS prediction_entries_status_check,
ADD CONSTRAINT prediction_entries_status_check 
CHECK (status IN ('active', 'won', 'lost', 'refunded', 'pending'));

-- Add leaderboard support - we'll need views or computed stats
CREATE OR REPLACE VIEW user_leaderboard_stats AS
SELECT 
    u.id,
    u.username,
    u.full_name,
    u.avatar_url,
    COALESCE(created_stats.predictions_count, 0) as predictions_count,
    COALESCE(entry_stats.total_invested, 0) as total_invested,
    COALESCE(entry_stats.total_profit, 0) as total_profit,
    COALESCE(entry_stats.total_entries, 0) as total_entries,
    CASE 
        WHEN COALESCE(entry_stats.total_entries, 0) > 0 
        THEN ROUND((COALESCE(entry_stats.wins, 0)::DECIMAL / entry_stats.total_entries) * 100, 0)
        ELSE 0 
    END as win_rate
FROM users u
LEFT JOIN (
    SELECT 
        creator_id,
        COUNT(*) as predictions_count
    FROM predictions 
    WHERE status != 'cancelled'
    GROUP BY creator_id
) created_stats ON u.id = created_stats.creator_id
LEFT JOIN (
    SELECT 
        user_id,
        COUNT(*) as total_entries,
        SUM(amount) as total_invested,
        SUM(COALESCE(actual_payout, 0) - amount) as total_profit,
        COUNT(CASE WHEN status = 'won' THEN 1 END) as wins
    FROM prediction_entries
    GROUP BY user_id
) entry_stats ON u.id = entry_stats.user_id
WHERE u.id IN (
    SELECT DISTINCT creator_id FROM predictions WHERE creator_id IS NOT NULL
    UNION
    SELECT DISTINCT user_id FROM prediction_entries WHERE user_id IS NOT NULL
);
