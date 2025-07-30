-- ============================================================================
-- FAN CLUB Z DATABASE SCHEMA - SIMPLIFIED VERSION
-- ============================================================================
-- Execute this in your Supabase SQL Editor

-- ============================================================================
-- ENABLE EXTENSIONS
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================================
-- CORE TABLES
-- ============================================================================

-- Users Table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20),
  username VARCHAR(30) UNIQUE,
  full_name VARCHAR(255),
  avatar_url TEXT,
  wallet_address VARCHAR(255),
  kyc_level VARCHAR(20) DEFAULT 'none',
  kyc_status VARCHAR(20) DEFAULT 'pending',
  auth_provider VARCHAR(20) DEFAULT 'email',
  two_fa_enabled BOOLEAN DEFAULT FALSE,
  reputation_score DECIMAL(10,2) DEFAULT 0.00,
  is_verified BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Wallets Table
CREATE TABLE IF NOT EXISTS wallets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  currency VARCHAR(10) DEFAULT 'NGN',
  available_balance DECIMAL(18,8) DEFAULT 0.00000000,
  reserved_balance DECIMAL(18,8) DEFAULT 0.00000000,
  total_deposited DECIMAL(18,8) DEFAULT 0.00000000,
  total_withdrawn DECIMAL(18,8) DEFAULT 0.00000000,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, currency)
);

-- Wallet Transactions Table
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  currency VARCHAR(10) DEFAULT 'NGN',
  amount DECIMAL(18,8) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  reference VARCHAR(255),
  related_prediction_entry_id UUID,
  related_payout_id UUID,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Clubs Table
CREATE TABLE IF NOT EXISTS clubs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
  visibility VARCHAR(20) DEFAULT 'public',
  member_count INTEGER DEFAULT 0,
  avatar_url TEXT,
  cover_url TEXT,
  tags TEXT[] DEFAULT '{}',
  rules TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Club Members Table
CREATE TABLE IF NOT EXISTS club_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id UUID REFERENCES clubs(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(20) DEFAULT 'member',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(club_id, user_id)
);

-- Predictions Table
CREATE TABLE IF NOT EXISTS predictions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL,
  type VARCHAR(20) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  stake_min DECIMAL(18,8) NOT NULL CHECK (stake_min > 0),
  stake_max DECIMAL(18,8) CHECK (stake_max IS NULL OR stake_max > stake_min),
  pool_total DECIMAL(18,8) DEFAULT 0.00000000,
  entry_deadline TIMESTAMPTZ NOT NULL,
  settlement_method VARCHAR(20) NOT NULL,
  settlement_proof_url TEXT,
  settled_outcome_id UUID,
  is_private BOOLEAN DEFAULT FALSE,
  password_hash VARCHAR(255),
  creator_fee_percentage DECIMAL(5,2) DEFAULT 0.00,
  platform_fee_percentage DECIMAL(5,2) DEFAULT 2.50,
  club_id UUID REFERENCES clubs(id) ON DELETE SET NULL,
  sponsor_id UUID,
  image_url TEXT,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Prediction Options Table
CREATE TABLE IF NOT EXISTS prediction_options (
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
CREATE TABLE IF NOT EXISTS prediction_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  prediction_id UUID REFERENCES predictions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  option_id UUID REFERENCES prediction_options(id) ON DELETE CASCADE,
  amount DECIMAL(18,8) NOT NULL CHECK (amount > 0),
  potential_payout DECIMAL(18,8),
  actual_payout DECIMAL(18,8),
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(prediction_id, user_id, option_id)
);

-- Comments Table
CREATE TABLE IF NOT EXISTS comments (
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
CREATE TABLE IF NOT EXISTS reactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  prediction_id UUID REFERENCES predictions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(prediction_id, user_id, type)
);

-- Club Discussions Table
CREATE TABLE IF NOT EXISTS club_discussions (
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
CREATE TABLE IF NOT EXISTS club_discussion_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  discussion_id UUID REFERENCES club_discussions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (LENGTH(content) >= 1 AND LENGTH(content) <= 1000),
  parent_comment_id UUID REFERENCES club_discussion_comments(id) ON DELETE CASCADE,
  is_edited BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- Predictions indexes
CREATE INDEX IF NOT EXISTS idx_predictions_creator_id ON predictions(creator_id);
CREATE INDEX IF NOT EXISTS idx_predictions_category ON predictions(category);
CREATE INDEX IF NOT EXISTS idx_predictions_status ON predictions(status);
CREATE INDEX IF NOT EXISTS idx_predictions_entry_deadline ON predictions(entry_deadline);
CREATE INDEX IF NOT EXISTS idx_predictions_created_at ON predictions(created_at);
CREATE INDEX IF NOT EXISTS idx_predictions_club_id ON predictions(club_id);

-- Prediction Options indexes
CREATE INDEX IF NOT EXISTS idx_prediction_options_prediction_id ON prediction_options(prediction_id);

-- Prediction Entries indexes
CREATE INDEX IF NOT EXISTS idx_prediction_entries_prediction_id ON prediction_entries(prediction_id);
CREATE INDEX IF NOT EXISTS idx_prediction_entries_user_id ON prediction_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_prediction_entries_status ON prediction_entries(status);

-- Wallet Transactions indexes
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_id ON wallet_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_type ON wallet_transactions(type);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_status ON wallet_transactions(status);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_created_at ON wallet_transactions(created_at);

-- Clubs indexes
CREATE INDEX IF NOT EXISTS idx_clubs_owner_id ON clubs(owner_id);
CREATE INDEX IF NOT EXISTS idx_clubs_visibility ON clubs(visibility);
CREATE INDEX IF NOT EXISTS idx_clubs_created_at ON clubs(created_at);

-- Club Members indexes
CREATE INDEX IF NOT EXISTS idx_club_members_club_id ON club_members(club_id);
CREATE INDEX IF NOT EXISTS idx_club_members_user_id ON club_members(user_id);

-- Comments indexes
CREATE INDEX IF NOT EXISTS idx_comments_prediction_id ON comments(prediction_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at);

-- Reactions indexes
CREATE INDEX IF NOT EXISTS idx_reactions_prediction_id ON reactions(prediction_id);
CREATE INDEX IF NOT EXISTS idx_reactions_user_id ON reactions(user_id);

-- Notifications indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);

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
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_users_updated_at') THEN
        CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_wallets_updated_at') THEN
        CREATE TRIGGER update_wallets_updated_at BEFORE UPDATE ON wallets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_predictions_updated_at') THEN
        CREATE TRIGGER update_predictions_updated_at BEFORE UPDATE ON predictions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_clubs_updated_at') THEN
        CREATE TRIGGER update_clubs_updated_at BEFORE UPDATE ON clubs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

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

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_club_member_count_trigger') THEN
        CREATE TRIGGER update_club_member_count_trigger
            AFTER INSERT OR DELETE ON club_members
            FOR EACH ROW EXECUTE FUNCTION update_club_member_count();
    END IF;
END $$;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on sensitive tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE prediction_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (can be expanded later)
DO $$
BEGIN
    -- Users can view public profiles
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'public_profiles_viewable') THEN
        CREATE POLICY "public_profiles_viewable" ON users FOR SELECT USING (true);
    END IF;
    
    -- Users can view their own wallet
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'wallets' AND policyname = 'own_wallet_access') THEN
        CREATE POLICY "own_wallet_access" ON wallets FOR ALL USING (auth.uid()::text = user_id::text);
    END IF;
    
    -- Users can view their own transactions
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'wallet_transactions' AND policyname = 'own_transactions_access') THEN
        CREATE POLICY "own_transactions_access" ON wallet_transactions FOR ALL USING (auth.uid()::text = user_id::text);
    END IF;
    
    -- Anyone can view public predictions
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'predictions' AND policyname = 'public_predictions_viewable') THEN
        CREATE POLICY "public_predictions_viewable" ON predictions FOR SELECT USING (NOT is_private);
    END IF;
    
    -- Users can view their own prediction entries
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'prediction_entries' AND policyname = 'own_entries_access') THEN
        CREATE POLICY "own_entries_access" ON prediction_entries FOR ALL USING (auth.uid()::text = user_id::text);
    END IF;
    
    -- Users can view their own notifications
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notifications' AND policyname = 'own_notifications_access') THEN
        CREATE POLICY "own_notifications_access" ON notifications FOR ALL USING (auth.uid()::text = user_id::text);
    END IF;
END $$;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

SELECT 'Fan Club Z database schema created successfully! 🎉' AS result;
SELECT 'Tables created: users, wallets, predictions, clubs, and more' AS info;
SELECT 'Ready for sample data insertion' AS next_step;
