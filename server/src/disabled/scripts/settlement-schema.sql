-- Settlement System Database Schema
-- Fan Club Z v2.0

-- 1. Approved Sources Table
CREATE TABLE IF NOT EXISTS approved_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    url VARCHAR(500) NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN ('sports', 'music', 'film', 'finance', 'pop_culture')),
    trust_level VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (trust_level IN ('high', 'medium', 'pending')),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('approved', 'pending', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    approved_by UUID REFERENCES auth.users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(url, category)
);

-- 2. Settlement Configuration Table
CREATE TABLE IF NOT EXISTS settlement_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prediction_id UUID NOT NULL REFERENCES predictions(id) ON DELETE CASCADE,
    method VARCHAR(20) NOT NULL DEFAULT 'manual' CHECK (method IN ('api', 'web', 'oracle', 'manual')),
    primary_source_id UUID REFERENCES approved_sources(id),
    backup_source_id UUID REFERENCES approved_sources(id),
    rule_text TEXT NOT NULL,
    timezone VARCHAR(50) NOT NULL DEFAULT 'Africa/Lagos',
    contingencies JSONB NOT NULL DEFAULT '{}',
    risk_flags TEXT[] DEFAULT '{}',
    badges TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Settlements Table
CREATE TABLE IF NOT EXISTS settlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prediction_id UUID NOT NULL REFERENCES predictions(id) ON DELETE CASCADE,
    state VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (state IN ('open', 'locked', 'settling', 'settled', 'voided', 'disputed', 'resolved')),
    outcome VARCHAR(10) CHECK (outcome IN ('YES', 'NO')),
    settled_at TIMESTAMP WITH TIME ZONE,
    proof JSONB DEFAULT '{}',
    audit_log JSONB DEFAULT '[]',
    acceptance_window_hours INTEGER DEFAULT 24,
    acceptance_stats JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Player Acceptance Records
CREATE TABLE IF NOT EXISTS player_acceptances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prediction_id UUID NOT NULL REFERENCES predictions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    action VARCHAR(20) NOT NULL CHECK (action IN ('accepted', 'auto_accepted', 'disputed')),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(prediction_id, user_id)
);

-- 5. Disputes Table
CREATE TABLE IF NOT EXISTS disputes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prediction_id UUID NOT NULL REFERENCES predictions(id) ON DELETE CASCADE,
    opened_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    opened_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reason VARCHAR(50) NOT NULL CHECK (reason IN ('source_updated', 'wrong_source', 'timing', 'other')),
    evidence JSONB DEFAULT '[]',
    state VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (state IN ('open', 'under_review', 'upheld', 'overturned')),
    resolution_note TEXT,
    resolved_by UUID REFERENCES auth.users(id),
    resolved_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Audit Timeline Table
CREATE TABLE IF NOT EXISTS audit_timeline (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prediction_id UUID NOT NULL REFERENCES predictions(id) ON DELETE CASCADE,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    actor_type VARCHAR(20) NOT NULL CHECK (actor_type IN ('system', 'user', 'admin', 'oracle')),
    actor_id UUID REFERENCES auth.users(id),
    event VARCHAR(50) NOT NULL,
    data JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_settlements_prediction_id ON settlements(prediction_id);
CREATE INDEX IF NOT EXISTS idx_settlements_state ON settlements(state);
CREATE INDEX IF NOT EXISTS idx_player_acceptances_prediction_user ON player_acceptances(prediction_id, user_id);
CREATE INDEX IF NOT EXISTS idx_disputes_prediction_id ON disputes(prediction_id);
CREATE INDEX IF NOT EXISTS idx_disputes_state ON disputes(state);
CREATE INDEX IF NOT EXISTS idx_audit_timeline_prediction_id ON audit_timeline(prediction_id);
CREATE INDEX IF NOT EXISTS idx_audit_timeline_timestamp ON audit_timeline(timestamp);
CREATE INDEX IF NOT EXISTS idx_approved_sources_category_status ON approved_sources(category, status);

-- Row Level Security Policies
ALTER TABLE approved_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE settlement_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_acceptances ENABLE ROW LEVEL SECURITY;
ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_timeline ENABLE ROW LEVEL SECURITY;

-- Approved sources: Readable by all, writable by admins
CREATE POLICY "approved_sources_read_all" ON approved_sources FOR SELECT USING (true);
CREATE POLICY "approved_sources_write_admin" ON approved_sources FOR ALL USING (
    EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND role = 'admin')
);

-- Settlement configs: Readable by all, writable by prediction creator
CREATE POLICY "settlement_configs_read_all" ON settlement_configs FOR SELECT USING (true);
CREATE POLICY "settlement_configs_write_creator" ON settlement_configs FOR ALL USING (
    EXISTS (
        SELECT 1 FROM predictions p 
        WHERE p.id = settlement_configs.prediction_id 
        AND p.creator_id = auth.uid()
    )
);

-- Settlements: Readable by all, writable by system/admins
CREATE POLICY "settlements_read_all" ON settlements FOR SELECT USING (true);
CREATE POLICY "settlements_write_system" ON settlements FOR ALL USING (
    EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND role = 'admin')
);

-- Player acceptances: Readable by all, writable by the user
CREATE POLICY "player_acceptances_read_all" ON player_acceptances FOR SELECT USING (true);
CREATE POLICY "player_acceptances_write_owner" ON player_acceptances FOR ALL USING (user_id = auth.uid());

-- Disputes: Readable by all, writable by the disputer and admins
CREATE POLICY "disputes_read_all" ON disputes FOR SELECT USING (true);
CREATE POLICY "disputes_write_owner" ON disputes FOR ALL USING (
    opened_by = auth.uid() OR 
    EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND role = 'admin')
);

-- Audit timeline: Readable by all, writable by system/admins
CREATE POLICY "audit_timeline_read_all" ON audit_timeline FOR SELECT USING (true);
CREATE POLICY "audit_timeline_write_system" ON audit_timeline FOR ALL USING (
    EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND role = 'admin')
);

-- Functions for settlement management
CREATE OR REPLACE FUNCTION create_settlement_for_prediction(prediction_uuid UUID)
RETURNS UUID AS $$
DECLARE
    settlement_id UUID;
BEGIN
    INSERT INTO settlements (prediction_id, state, created_at, updated_at)
    VALUES (prediction_uuid, 'open', NOW(), NOW())
    RETURNING id INTO settlement_id;
    
    -- Add to audit timeline
    INSERT INTO audit_timeline (prediction_id, actor_type, event, data)
    VALUES (prediction_uuid, 'system', 'settlement_created', jsonb_build_object('settlement_id', settlement_id));
    
    RETURN settlement_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update settlement state
CREATE OR REPLACE FUNCTION update_settlement_state(
    prediction_uuid UUID,
    new_state VARCHAR(20),
    outcome_val VARCHAR(10) DEFAULT NULL,
    proof_data JSONB DEFAULT '{}'
)
RETURNS BOOLEAN AS $$
DECLARE
    current_state VARCHAR(20);
BEGIN
    SELECT state INTO current_state FROM settlements WHERE prediction_id = prediction_uuid;
    
    IF current_state IS NULL THEN
        RETURN FALSE;
    END IF;
    
    UPDATE settlements 
    SET 
        state = new_state,
        outcome = outcome_val,
        settled_at = CASE WHEN new_state = 'settled' THEN NOW() ELSE settled_at END,
        proof = CASE WHEN new_state = 'settled' THEN proof_data ELSE proof END,
        updated_at = NOW()
    WHERE prediction_id = prediction_uuid;
    
    -- Add to audit timeline
    INSERT INTO audit_timeline (prediction_id, actor_type, event, data)
    VALUES (
        prediction_uuid, 
        'system', 
        'settlement_state_changed',
        jsonb_build_object(
            'from_state', current_state,
            'to_state', new_state,
            'outcome', outcome_val
        )
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to record player acceptance
CREATE OR REPLACE FUNCTION record_player_acceptance(
    prediction_uuid UUID,
    user_uuid UUID,
    action_val VARCHAR(20)
)
RETURNS BOOLEAN AS $$
BEGIN
    INSERT INTO player_acceptances (prediction_id, user_id, action, timestamp)
    VALUES (prediction_uuid, user_uuid, action_val, NOW())
    ON CONFLICT (prediction_id, user_id) 
    DO UPDATE SET 
        action = action_val,
        timestamp = NOW();
    
    -- Add to audit timeline
    INSERT INTO audit_timeline (prediction_id, actor_type, actor_id, event, data)
    VALUES (prediction_uuid, 'user', user_uuid, 'player_acceptance', jsonb_build_object('action', action_val));
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create dispute
CREATE OR REPLACE FUNCTION create_dispute(
    prediction_uuid UUID,
    user_uuid UUID,
    reason_val VARCHAR(50),
    evidence_data JSONB DEFAULT '[]'
)
RETURNS UUID AS $$
DECLARE
    dispute_id UUID;
BEGIN
    INSERT INTO disputes (prediction_id, opened_by, reason, evidence, state)
    VALUES (prediction_uuid, user_uuid, reason_val, evidence_data, 'open')
    RETURNING id INTO dispute_id;
    
    -- Update settlement state to disputed
    PERFORM update_settlement_state(prediction_uuid, 'disputed');
    
    -- Add to audit timeline
    INSERT INTO audit_timeline (prediction_id, actor_type, actor_id, event, data)
    VALUES (prediction_uuid, 'user', user_uuid, 'dispute_opened', jsonb_build_object('dispute_id', dispute_id, 'reason', reason_val));
    
    RETURN dispute_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert some default approved sources
INSERT INTO approved_sources (name, url, category, trust_level, status) VALUES
('Premier League', 'https://www.premierleague.com', 'sports', 'high', 'approved'),
('ESPN', 'https://www.espn.com', 'sports', 'high', 'approved'),
('BBC Sport', 'https://www.bbc.com/sport', 'sports', 'high', 'approved'),
('Apple Music', 'https://music.apple.com', 'music', 'high', 'approved'),
('Spotify', 'https://open.spotify.com', 'music', 'high', 'approved'),
('IMDb', 'https://www.imdb.com', 'film', 'high', 'approved'),
('Box Office Mojo', 'https://www.boxofficemojo.com', 'film', 'high', 'approved'),
('Yahoo Finance', 'https://finance.yahoo.com', 'finance', 'high', 'approved'),
('Bloomberg', 'https://www.bloomberg.com', 'finance', 'high', 'approved'),
('Twitter', 'https://twitter.com', 'pop_culture', 'medium', 'approved'),
('Instagram', 'https://www.instagram.com', 'pop_culture', 'medium', 'approved')
ON CONFLICT (url, category) DO NOTHING;
