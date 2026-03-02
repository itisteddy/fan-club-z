-- Create bet_settlements table if it doesn't exist
-- This table tracks the settlement status for each prediction

CREATE TABLE IF NOT EXISTS bet_settlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bet_id UUID NOT NULL REFERENCES predictions(id) ON DELETE CASCADE,
    winning_option_id UUID REFERENCES prediction_options(id),
    status VARCHAR(50) NOT NULL DEFAULT 'pending' 
        CHECK (status IN ('pending', 'computing', 'computed', 'posting', 'onchain_posted', 'completed', 'failed', 'cancelled')),
    meta JSONB DEFAULT '{}',
    merkle_root VARCHAR(66), -- 0x + 64 hex chars
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(bet_id)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_bet_settlements_bet_id ON bet_settlements(bet_id);
CREATE INDEX IF NOT EXISTS idx_bet_settlements_status ON bet_settlements(status);
CREATE INDEX IF NOT EXISTS idx_bet_settlements_created_at ON bet_settlements(created_at DESC);

-- RLS policies
ALTER TABLE bet_settlements ENABLE ROW LEVEL SECURITY;

-- Allow read access for all authenticated users
CREATE POLICY IF NOT EXISTS "bet_settlements_read_all" ON bet_settlements 
    FOR SELECT USING (true);

-- Allow service role to write
CREATE POLICY IF NOT EXISTS "bet_settlements_write_service" ON bet_settlements 
    FOR ALL USING (true);

-- Comment
COMMENT ON TABLE bet_settlements IS 'Tracks settlement status for predictions including Merkle tree computation and on-chain posting';
COMMENT ON COLUMN bet_settlements.status IS 'pending -> computing -> computed -> posting -> onchain_posted -> completed';

