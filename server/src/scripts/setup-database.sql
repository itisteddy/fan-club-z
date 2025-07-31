-- ============================================================================
-- FAN CLUB Z DATABASE SCHEMA
-- ============================================================================
-- This script sets up the complete database schema for Fan Club Z
-- Execute this in your Supabase SQL Editor

-- ============================================================================
-- ENABLE EXTENSIONS
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================================
-- CUSTOM TYPES
-- ============================================================================

-- KYC Level Enum
CREATE TYPE kyc_level AS ENUM ('none', 'basic', 'enhanced');

-- KYC Status Enum  
CREATE TYPE kyc_status AS ENUM ('pending', 'submitted', 'under_review', 'approved', 'rejected');

-- Auth Provider Enum
CREATE TYPE auth_provider AS ENUM ('email', 'google', 'apple');

-- Prediction Category Enum
CREATE TYPE prediction_category AS ENUM ('sports', 'pop_culture', 'custom', 'esports', 'celebrity_gossip', 'politics');

-- Prediction Type Enum
CREATE TYPE prediction_type AS ENUM ('binary', 'multi_outcome', 'pool');

-- Prediction Status Enum
CREATE TYPE prediction_status AS ENUM ('pending', 'open', 'closed', 'settled', 'disputed', 'cancelled');

-- Settlement Method Enum
CREATE TYPE settlement_method AS ENUM ('auto', 'manual');

-- Currency Enum
CREATE TYPE currency_type AS ENUM ('NGN', 'USD', 'USDT', 'ETH');

-- Transaction Type Enum
CREATE TYPE transaction_type AS ENUM ('deposit', 'withdraw', 'prediction_lock', 'prediction_release', 'transfer_in', 'transfer_out', 'fee', 'creator_payout');

-- Transaction Status Enum
CREATE TYPE transaction_status AS ENUM ('pending', 'completed', 'failed', 'reversed');

-- Prediction Entry Status Enum
CREATE TYPE prediction_entry_status AS ENUM ('active', 'won', 'lost', 'refunded');

-- Reaction Type Enum
CREATE TYPE reaction_type AS ENUM ('like', 'cheer', 'fire', 'thinking');

-- Club Visibility Enum
CREATE TYPE club_visibility AS ENUM ('public', 'private', 'invite_only');

-- Club Role Enum
CREATE TYPE club_role AS ENUM ('member', 'moderator', 'admin');

-- Notification Type Enum
CREATE TYPE notification_type AS ENUM ('prediction_settled', 'prediction_ending', 'comment_reply', 'club_invite', 'payment_received', 'system_announcement');

-- ============================================================================
-- CORE TABLES
-- ============================================================================

-- Users Table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20),
  username VARCHAR(30) UNIQUE,
  full_name VARCHAR(255),
  avatar_url TEXT,
  wallet_address VARCHAR(255),
  kyc_level kyc_level DEFAULT 'none',
  kyc_status kyc_status DEFAULT 'pending',
  auth_provider auth_provider DEFAULT 'email',
  two_fa_enabled BOOLEAN DEFAULT FALSE,
  reputation_score DECIMAL(10,2) DEFAULT 0.00,
  is_verified BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- KYC Submissions Table
CREATE TABLE kyc_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  submission_level kyc_level NOT NULL,
  full_name VARCHAR(255),
  date_of_birth DATE,
  id_document_type VARCHAR(50),
  id_document_url TEXT,
  status kyc_status DEFAULT 'submitted',
  rejection_reason TEXT,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  verified_at TIMESTAMPTZ,
  UNIQUE(user_id)
);

-- Wallets Table
CREATE TABLE wallets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  currency currency_type DEFAULT 'NGN',
  available_balance DECIMAL(18,8) DEFAULT 0.00000000,
  reserved_balance DECIMAL(18,8) DEFAULT 0.00000000,
  total_deposited DECIMAL(18,8) DEFAULT 0.00000000,
  total_withdrawn DECIMAL(18,8) DEFAULT 0.00000000,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, currency)
);

-- Wallet Transactions Table
CREATE TABLE wallet_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type transaction_type NOT NULL,
  currency currency_type DEFAULT 'NGN',
  amount DECIMAL(18,8) NOT NULL,
  status transaction_status DEFAULT 'pending',
  reference VARCHAR(255),
  related_prediction_entry_id UUID,
  related_payout_id UUID,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Clubs Table
CREATE TABLE clubs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
  visibility club_visibility DEFAULT 'public',
  member_count INTEGER DEFAULT 0,
  avatar_url TEXT,
  cover_url TEXT,
  tags TEXT[] DEFAULT '{}',
  rules TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Club Members Table
CREATE TABLE club_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id UUID REFERENCES clubs(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role club_role DEFAULT 'member',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(club_id, user_id)
);

-- Predictions Table
CREATE TABLE predictions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category prediction_category NOT NULL,
  type prediction_type NOT NULL,
  status prediction_status DEFAULT 'pending',
  stake_min DECIMAL(18,8) NOT NULL CHECK (stake_min > 0),
  stake_max DECIMAL(18,8) CHECK (stake_max IS NULL OR stake_max > stake_min),
  pool_total DECIMAL(18,8) DEFAULT 0.00000000,
  entry_deadline TIMESTAMPTZ NOT NULL,
  settlement_method settlement_method NOT NULL,
  settlement_proof_url TEXT,
  settled_outcome_id UUID,
  is_private BOOLEAN DEFAULT FALSE,
  password_hash VARCHAR(255),
  creator_fee_percentage DECIMAL(5,2) DEFAULT 0.00 CHECK (creator_fee_percentage >= 0 AND creator_fee_percentage <= 100),
  platform_fee_percentage DECIMAL(5,2) DEFAULT 2.50 CHECK (platform_fee_percentage >= 0 AND platform_fee_percentage <= 100),
  club_id UUID REFERENCES clubs(id) ON DELETE SET NULL,
  sponsor_id UUID,
  image_url TEXT,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (entry_deadline > created_at)
);

-- Prediction Options Table
CREATE TABLE prediction_options (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  prediction_id UUID REFERENCES predictions(id) ON DELETE CASCADE,
  label VARCHAR(255) NOT NULL,
  total_staked DECIMAL(18,8) DEFAULT 0.00000000,
  current_odds DECIMAL(18,8) DEFAULT 1.00000000,
  is_winning_outcome BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(prediction_id, label)
);

-- Prediction Entries Table
CREATE TABLE prediction_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  prediction_id UUID REFERENCES predictions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  option_id UUID REFERENCES prediction_options(id) ON DELETE CASCADE,
  amount DECIMAL(18,8) NOT NULL CHECK (amount > 0),
  potential_payout DECIMAL(18,8),
  actual_payout DECIMAL(18,8),
  status prediction_entry_status DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(prediction_id, user_id, option_id)
);

-- Prediction Settlements Table
CREATE TABLE prediction_settlements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  prediction_id UUID REFERENCES predictions(id) ON DELETE CASCADE,
  settlement_time TIMESTAMPTZ DEFAULT NOW(),
  winning_option_id UUID REFERENCES prediction_options(id),
  total_payout DECIMAL(18,8) NOT NULL DEFAULT 0,
  platform_fee_collected DECIMAL(18,8) NOT NULL DEFAULT 0,
  creator_payout_amount DECIMAL(18,8) NOT NULL DEFAULT 0,
  blockchain_tx_hash VARCHAR(255),
  dispute_resolved BOOLEAN DEFAULT FALSE,
  UNIQUE(prediction_id)
);

-- Disputes Table
CREATE TABLE disputes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  prediction_id UUID REFERENCES predictions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  evidence_url TEXT,
  status VARCHAR(50) DEFAULT 'open' CHECK (status IN ('open', 'under_review', 'resolved', 'rejected')),
  resolution TEXT,
  resolved_by_user_id UUID REFERENCES users(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Comments Table
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  prediction_id UUID REFERENCES predictions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (LENGTH(content) >= 1 AND LENGTH(content) <= 1000),
  parent_comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  is_edited BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reactions Table
CREATE TABLE reactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  prediction_id UUID REFERENCES predictions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type reaction_type NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(prediction_id, user_id, type)
);

-- Club Discussions Table
CREATE TABLE club_discussions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id UUID REFERENCES clubs(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  content TEXT,
  is_pinned BOOLEAN DEFAULT FALSE,
  comment_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Club Discussion Comments Table
CREATE TABLE club_discussion_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  discussion_id UUID REFERENCES club_discussions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (LENGTH(content) >= 1 AND LENGTH(content) <= 1000),
  parent_comment_id UUID REFERENCES club_discussion_comments(id) ON DELETE CASCADE,
  is_edited BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Creator Payouts Table
CREATE TABLE creator_payouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID REFERENCES users(id) ON DELETE CASCADE,
  prediction_id UUID REFERENCES predictions(id) ON DELETE CASCADE,
  amount DECIMAL(18,8) NOT NULL,
  currency currency_type DEFAULT 'NGN',
  status transaction_status DEFAULT 'pending',
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sponsors Table (Future)
CREATE TABLE sponsors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) UNIQUE NOT NULL,
  logo_url TEXT,
  website_url TEXT,
  contact_email VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications Table
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Reputation Table
CREATE TABLE user_reputations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  predictions_created_count INTEGER DEFAULT 0,
  predictions_settled_count INTEGER DEFAULT 0,
  successful_settlements_count INTEGER DEFAULT 0,
  dispute_ratio DECIMAL(5,2) DEFAULT 0.00,
  average_prediction_rating DECIMAL(3,2),
  followers_count INTEGER DEFAULT 0,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Smart Contract Interactions Table (Future)
CREATE TABLE smart_contract_interactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  prediction_id UUID REFERENCES predictions(id) ON DELETE SET NULL,
  type VARCHAR(100) NOT NULL,
  contract_address VARCHAR(255) NOT NULL,
  transaction_hash VARCHAR(255) UNIQUE NOT NULL,
  block_number BIGINT,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'failed')),
  gas_used DECIMAL(18,0),
  gas_price DECIMAL(18,0),
  payload_json JSONB,
  result_json JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Users indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_kyc_level ON users(kyc_level);
CREATE INDEX idx_users_is_active ON users(is_active);
CREATE INDEX idx_users_created_at ON users(created_at);

-- Predictions indexes
CREATE INDEX idx_predictions_creator_id ON predictions(creator_id);
CREATE INDEX idx_predictions_category ON predictions(category);
CREATE INDEX idx_predictions_status ON predictions(status);
CREATE INDEX idx_predictions_entry_deadline ON predictions(entry_deadline);
CREATE INDEX idx_predictions_created_at ON predictions(created_at);
CREATE INDEX idx_predictions_club_id ON predictions(club_id);
CREATE INDEX idx_predictions_pool_total ON predictions(pool_total);

-- Prediction Options indexes
CREATE INDEX idx_prediction_options_prediction_id ON prediction_options(prediction_id);
CREATE INDEX idx_prediction_options_total_staked ON prediction_options(total_staked);

-- Prediction Entries indexes
CREATE INDEX idx_prediction_entries_prediction_id ON prediction_entries(prediction_id);
CREATE INDEX idx_prediction_entries_user_id ON prediction_entries(user_id);
CREATE INDEX idx_prediction_entries_status ON prediction_entries(status);
CREATE INDEX idx_prediction_entries_created_at ON prediction_entries(created_at);

-- Wallet Transactions indexes
CREATE INDEX idx_wallet_transactions_user_id ON wallet_transactions(user_id);
CREATE INDEX idx_wallet_transactions_type ON wallet_transactions(type);
CREATE INDEX idx_wallet_transactions_status ON wallet_transactions(status);
CREATE INDEX idx_wallet_transactions_created_at ON wallet_transactions(created_at);
CREATE INDEX idx_wallet_transactions_reference ON wallet_transactions(reference);

-- Clubs indexes
CREATE INDEX idx_clubs_owner_id ON clubs(owner_id);
CREATE INDEX idx_clubs_visibility ON clubs(visibility);
CREATE INDEX idx_clubs_member_count ON clubs(member_count);
CREATE INDEX idx_clubs_created_at ON clubs(created_at);

-- Club Members indexes
CREATE INDEX idx_club_members_club_id ON club_members(club_id);
CREATE INDEX idx_club_members_user_id ON club_members(user_id);
CREATE INDEX idx_club_members_role ON club_members(role);

-- Comments indexes
CREATE INDEX idx_comments_prediction_id ON comments(prediction_id);
CREATE INDEX idx_comments_user_id ON comments(user_id);
CREATE INDEX idx_comments_parent_comment_id ON comments(parent_comment_id);
CREATE INDEX idx_comments_created_at ON comments(created_at);

-- Reactions indexes
CREATE INDEX idx_reactions_prediction_id ON reactions(prediction_id);
CREATE INDEX idx_reactions_user_id ON reactions(user_id);
CREATE INDEX idx_reactions_type ON reactions(type);

-- Notifications indexes
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);

-- Full-text search indexes
CREATE INDEX idx_predictions_search ON predictions USING gin(to_tsvector('english', title || ' ' || COALESCE(description, '')));
CREATE INDEX idx_clubs_search ON clubs USING gin(to_tsvector('english', name || ' ' || COALESCE(description, '')));

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Updated timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers to relevant tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_wallets_updated_at BEFORE UPDATE ON wallets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_wallet_transactions_updated_at BEFORE UPDATE ON wallet_transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_predictions_updated_at BEFORE UPDATE ON predictions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_prediction_options_updated_at BEFORE UPDATE ON prediction_options FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_prediction_entries_updated_at BEFORE UPDATE ON prediction_entries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_clubs_updated_at BEFORE UPDATE ON clubs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_club_members_updated_at BEFORE UPDATE ON club_members FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON comments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_club_discussions_updated_at BEFORE UPDATE ON club_discussions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_club_discussion_comments_updated_at BEFORE UPDATE ON club_discussion_comments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_notifications_updated_at BEFORE UPDATE ON notifications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Club member count trigger
CREATE OR REPLACE FUNCTION update_club_member_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE clubs SET member_count = member_count + 1 WHERE id = NEW.club_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE clubs SET member_count = GREATEST(0, member_count - 1) WHERE id = OLD.club_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_club_member_count_trigger
    AFTER INSERT OR DELETE ON club_members
    FOR EACH ROW EXECUTE FUNCTION update_club_member_count();

-- Club discussion comment count trigger
CREATE OR REPLACE FUNCTION update_discussion_comment_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE club_discussions SET comment_count = comment_count + 1 WHERE id = NEW.discussion_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE club_discussions SET comment_count = GREATEST(0, comment_count - 1) WHERE id = OLD.discussion_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_discussion_comment_count_trigger
    AFTER INSERT OR DELETE ON club_discussion_comments
    FOR EACH ROW EXECUTE FUNCTION update_discussion_comment_count();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE kyc_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE prediction_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE prediction_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view their own profile" ON users FOR SELECT USING (auth.uid()::text = id::text);
CREATE POLICY "Users can update their own profile" ON users FOR UPDATE USING (auth.uid()::text = id::text);
CREATE POLICY "Public user profiles viewable" ON users FOR SELECT USING (true);

-- Wallet policies
CREATE POLICY "Users can view their own wallet" ON wallets FOR SELECT USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can view their own transactions" ON wallet_transactions FOR SELECT USING (auth.uid()::text = user_id::text);

-- Prediction policies
CREATE POLICY "Anyone can view public predictions" ON predictions FOR SELECT USING (NOT is_private);
CREATE POLICY "Users can view their own predictions" ON predictions FOR SELECT USING (auth.uid()::text = creator_id::text);
CREATE POLICY "Users can create predictions" ON predictions FOR INSERT WITH CHECK (auth.uid()::text = creator_id::text);
CREATE POLICY "Users can update their own predictions" ON predictions FOR UPDATE USING (auth.uid()::text = creator_id::text);

-- Prediction options policies
CREATE POLICY "Anyone can view prediction options for public predictions" ON prediction_options FOR SELECT USING (
    EXISTS (SELECT 1 FROM predictions WHERE predictions.id = prediction_options.prediction_id AND NOT predictions.is_private)
);

-- Prediction entries policies
CREATE POLICY "Users can view their own prediction entries" ON prediction_entries FOR SELECT USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can create prediction entries" ON prediction_entries FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

-- Club policies
CREATE POLICY "Anyone can view public clubs" ON clubs FOR SELECT USING (visibility = 'public');
CREATE POLICY "Club members can view their clubs" ON clubs FOR SELECT USING (
    EXISTS (SELECT 1 FROM club_members WHERE club_members.club_id = clubs.id AND club_members.user_id::text = auth.uid()::text)
);
CREATE POLICY "Users can create clubs" ON clubs FOR INSERT WITH CHECK (auth.uid()::text = owner_id::text);

-- Club member policies
CREATE POLICY "Club members can view other members" ON club_members FOR SELECT USING (
    EXISTS (SELECT 1 FROM club_members AS cm WHERE cm.club_id = club_members.club_id AND cm.user_id::text = auth.uid()::text)
);

-- Comment policies
CREATE POLICY "Anyone can view comments on public predictions" ON comments FOR SELECT USING (
    EXISTS (SELECT 1 FROM predictions WHERE predictions.id = comments.prediction_id AND NOT predictions.is_private)
);
CREATE POLICY "Users can create comments" ON comments FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);
CREATE POLICY "Users can update their own comments" ON comments FOR UPDATE USING (auth.uid()::text = user_id::text);

-- Reaction policies
CREATE POLICY "Anyone can view reactions on public predictions" ON reactions FOR SELECT USING (
    EXISTS (SELECT 1 FROM predictions WHERE predictions.id = reactions.prediction_id AND NOT predictions.is_private)
);
CREATE POLICY "Users can create reactions" ON reactions FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);
CREATE POLICY "Users can delete their own reactions" ON reactions FOR DELETE USING (auth.uid()::text = user_id::text);

-- Notification policies
CREATE POLICY "Users can view their own notifications" ON notifications FOR SELECT USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can update their own notifications" ON notifications FOR UPDATE USING (auth.uid()::text = user_id::text);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to calculate prediction odds
CREATE OR REPLACE FUNCTION calculate_prediction_odds(prediction_id UUID, option_id UUID)
RETURNS DECIMAL(18,8) AS $$
DECLARE
    total_pool DECIMAL(18,8);
    option_total DECIMAL(18,8);
    odds DECIMAL(18,8);
BEGIN
    SELECT pool_total INTO total_pool FROM predictions WHERE id = prediction_id;
    SELECT total_staked INTO option_total FROM prediction_options WHERE id = option_id;
    
    IF option_total = 0 OR total_pool = 0 THEN
        RETURN 1.0;
    END IF;
    
    odds := total_pool / option_total;
    RETURN GREATEST(1.0, odds);
END;
$$ LANGUAGE plpgsql;

-- Function to update prediction pool total
CREATE OR REPLACE FUNCTION update_prediction_pool_total(prediction_id UUID)
RETURNS VOID AS $$
DECLARE
    new_total DECIMAL(18,8);
BEGIN
    SELECT COALESCE(SUM(amount), 0) INTO new_total
    FROM prediction_entries
    WHERE prediction_entries.prediction_id = update_prediction_pool_total.prediction_id
    AND status = 'active';
    
    UPDATE predictions SET pool_total = new_total WHERE id = prediction_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SAMPLE DATA (FOR DEVELOPMENT)
-- ============================================================================

-- Insert sample users
INSERT INTO users (id, email, username, full_name, kyc_level, is_verified, reputation_score) VALUES
('11111111-1111-1111-1111-111111111111', 'admin@fanclubz.com', 'admin', 'Admin User', 'enhanced', true, 100.0),
('22222222-2222-2222-2222-222222222222', 'john@example.com', 'john_doe', 'John Doe', 'basic', true, 85.5),
('33333333-3333-3333-3333-333333333333', 'jane@example.com', 'jane_smith', 'Jane Smith', 'basic', true, 92.3),
('44444444-4444-4444-4444-444444444444', 'mike@example.com', 'mike_wilson', 'Mike Wilson', 'none', false, 45.7),
('55555555-5555-5555-5555-555555555555', 'sarah@example.com', 'sarah_jones', 'Sarah Jones', 'enhanced', true, 78.9);

-- Create default wallets for sample users
INSERT INTO wallets (user_id, currency, available_balance, total_deposited) VALUES
('11111111-1111-1111-1111-111111111111', 'NGN', 50000.00, 50000.00),
('22222222-2222-2222-2222-222222222222', 'NGN', 10000.00, 15000.00),
('33333333-3333-3333-3333-333333333333', 'NGN', 25000.00, 30000.00),
('44444444-4444-4444-4444-444444444444', 'NGN', 5000.00, 5000.00),
('55555555-5555-5555-5555-555555555555', 'NGN', 15000.00, 20000.00);

-- Insert sample clubs
INSERT INTO clubs (id, name, description, owner_id, visibility, member_count, tags) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Premier League Fans', 'Discussion and predictions about Premier League football', '22222222-2222-2222-2222-222222222222', 'public', 1, '{"sports", "football", "premier-league"}'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Crypto Enthusiasts', 'Predictions about cryptocurrency prices and trends', '33333333-3333-3333-3333-333333333333', 'public', 1, '{"crypto", "finance", "blockchain"}'),
('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Reality TV Addicts', 'Big Brother, Love Island, and more reality show predictions', '55555555-5555-5555-5555-555555555555', 'public', 1, '{"entertainment", "reality-tv", "pop-culture"}'
);

-- Add club memberships
INSERT INTO club_members (club_id, user_id, role) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 'admin'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '33333333-3333-3333-3333-333333333333', 'admin'),
('cccccccc-cccc-cccc-cccc-cccccccccccc', '55555555-5555-5555-5555-555555555555', 'admin'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', 'member'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'member');

-- Update club member counts
UPDATE clubs SET member_count = 2 WHERE id IN ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');

-- Insert sample predictions
INSERT INTO predictions (id, creator_id, title, description, category, type, status, stake_min, stake_max, entry_deadline, settlement_method, club_id, tags) VALUES
('dddddddd-dddd-dddd-dddd-dddddddddddd', '22222222-2222-2222-2222-222222222222', 'Will Manchester City win the Premier League this season?', 'Prediction about Manchester City winning the 2024-25 Premier League title', 'sports', 'binary', 'open', 100.00, 10000.00, NOW() + INTERVAL '7 days', 'manual', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '{"football", "premier-league", "manchester-city"}'),
('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '33333333-3333-3333-3333-333333333333', 'Bitcoin price at end of 2025', 'Will Bitcoin be above $100,000 at the end of 2025?', 'custom', 'binary', 'open', 50.00, 5000.00, '2025-12-31 23:59:59', 'auto', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '{"bitcoin", "crypto", "price"}'),
('ffffffff-ffff-ffff-ffff-ffffffffffff', '55555555-5555-5555-5555-555555555555', 'Next Big Brother winner', 'Who will win the next season of Big Brother Naija?', 'pop_culture', 'multi_outcome', 'open', 25.00, 2000.00, NOW() + INTERVAL '30 days', 'manual', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '{"big-brother", "reality-tv", "nigeria"}'
);

-- Insert prediction options
INSERT INTO prediction_options (id, prediction_id, label) VALUES
('gggggggg-gggg-gggg-gggg-gggggggggggg', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'Yes'),
('hhhhhhhh-hhhh-hhhh-hhhh-hhhhhhhhhhhh', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'No'),
('iiiiiiii-iiii-iiii-iiii-iiiiiiiiiiii', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Yes'),
('jjjjjjjj-jjjj-jjjj-jjjj-jjjjjjjjjjjj', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'No'),
('kkkkkkkk-kkkk-kkkk-kkkk-kkkkkkkkkkkk', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'Contestant A'),
('llllllll-llll-llll-llll-llllllllllll', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'Contestant B'),
('mmmmmmmm-mmmm-mmmm-mmmm-mmmmmmmmmmmm', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'Contestant C');

-- ============================================================================
-- FINAL SETUP
-- ============================================================================

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- Success message
SELECT 'Fan Club Z database schema created successfully!' AS message;
