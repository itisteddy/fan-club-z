-- Fan Club Z Database Schema Setup for Supabase
-- Run this SQL in your Supabase SQL Editor

-- 1. Enable the pgcrypto extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Create Users Table (only if it doesn't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users') THEN
        CREATE TABLE users (
          id UUID PRIMARY KEY DEFAULT auth.uid(),
          email TEXT UNIQUE,
          username TEXT UNIQUE,
          full_name TEXT,
          avatar_url TEXT,
          phone TEXT,
          wallet_address TEXT,
          kyc_level TEXT DEFAULT 'none' CHECK (kyc_level IN ('none', 'basic', 'enhanced')),
          kyc_status TEXT DEFAULT 'pending',
          auth_provider TEXT,
          two_fa_secret TEXT,
          reputation_score DECIMAL(10,2) DEFAULT 0.00,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- RLS policies for users
        ALTER TABLE users ENABLE ROW LEVEL SECURITY;

        CREATE POLICY "Users can view own profile" ON users
          FOR SELECT USING (auth.uid() = id);

        CREATE POLICY "Users can update own profile" ON users
          FOR UPDATE USING (auth.uid() = id);
    END IF;
END $$;

-- 3. Create Predictions Table
CREATE TABLE IF NOT EXISTS predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('binary', 'multi_outcome', 'pool')),
  status TEXT DEFAULT 'open' CHECK (status IN ('pending', 'open', 'closed', 'settled', 'disputed', 'cancelled')),
  stake_min DECIMAL(18,8) NOT NULL DEFAULT 100,
  stake_max DECIMAL(18,8),
  pool_total DECIMAL(18,8) DEFAULT 0,
  participant_count INTEGER DEFAULT 0,
  entry_deadline TIMESTAMP WITH TIME ZONE NOT NULL,
  settlement_method TEXT DEFAULT 'manual' CHECK (settlement_method IN ('auto', 'manual')),
  settlement_proof_url TEXT,
  settled_outcome_id UUID,
  is_private BOOLEAN DEFAULT FALSE,
  password_hash TEXT,
  creator_fee_percentage DECIMAL(5,2) DEFAULT 0.00,
  platform_fee_percentage DECIMAL(5,2) DEFAULT 3.00,
  parent_bet_id UUID REFERENCES predictions(id),
  conditional_logic_json JSONB,
  payout_rules_json JSONB,
  handicap_value DECIMAL(10,2),
  blockchain_escrow_address TEXT,
  club_id UUID,
  sponsor_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS policies for predictions
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view public predictions" ON predictions
  FOR SELECT USING (is_private = FALSE OR creator_id = auth.uid());

CREATE POLICY "Users can create predictions" ON predictions
  FOR INSERT WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Creators can update own predictions" ON predictions
  FOR UPDATE USING (auth.uid() = creator_id);

-- 4. Create Prediction Options Table
CREATE TABLE IF NOT EXISTS prediction_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prediction_id UUID REFERENCES predictions(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  total_staked DECIMAL(18,8) DEFAULT 0,
  current_odds DECIMAL(18,8) DEFAULT 1.0,
  is_winning_outcome BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE prediction_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view prediction options" ON prediction_options
  FOR SELECT USING (true);

CREATE POLICY "Users can create prediction options" ON prediction_options
  FOR INSERT WITH CHECK (true);

-- 5. Create Wallets Table
CREATE TABLE IF NOT EXISTS wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  currency TEXT NOT NULL DEFAULT 'NGN',
  available_balance DECIMAL(18,8) DEFAULT 0,
  reserved_balance DECIMAL(18,8) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, currency)
);

ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own wallet" ON wallets
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own wallet" ON wallets
  FOR UPDATE USING (auth.uid() = user_id);

-- 6. Create Wallet Transactions Table
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('deposit', 'withdraw', 'bet_lock', 'bet_release', 'transfer_in', 'transfer_out', 'fee', 'creator_payout')),
  currency TEXT NOT NULL DEFAULT 'NGN',
  amount DECIMAL(18,8) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'reversed')),
  reference TEXT UNIQUE,
  related_bet_entry_id UUID,
  related_payout_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions" ON wallet_transactions
  FOR SELECT USING (auth.uid() = user_id);

-- 7. Create Clubs Table
CREATE TABLE IF NOT EXISTS clubs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
  visibility TEXT DEFAULT 'public' CHECK (visibility IN ('public', 'private', 'invite_only')),
  member_count INTEGER DEFAULT 0,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE clubs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view public clubs" ON clubs
  FOR SELECT USING (visibility = 'public' OR owner_id = auth.uid());

CREATE POLICY "Users can create clubs" ON clubs
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update own clubs" ON clubs
  FOR UPDATE USING (auth.uid() = owner_id);

-- 8. Create Comments Table
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prediction_id UUID REFERENCES predictions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  parent_comment_id UUID REFERENCES comments(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view comments" ON comments
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create comments" ON comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 9. Create Reactions Table
CREATE TABLE IF NOT EXISTS reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prediction_id UUID REFERENCES predictions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('like', 'cheer')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(prediction_id, user_id, type)
);

ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view reactions" ON reactions
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create reactions" ON reactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 10. Create Prediction Entries Table (for when users place predictions)
CREATE TABLE IF NOT EXISTS prediction_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prediction_id UUID REFERENCES predictions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  option_id UUID REFERENCES prediction_options(id) ON DELETE CASCADE,
  amount DECIMAL(18,8) NOT NULL,
  potential_payout DECIMAL(18,8),
  actual_payout DECIMAL(18,8),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'won', 'lost', 'refunded')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(prediction_id, user_id, option_id)
);

ALTER TABLE prediction_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own prediction entries" ON prediction_entries
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create prediction entries" ON prediction_entries
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 11. Create Functions and Triggers (with existence checks)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop existing triggers if they exist and recreate them
DO $$ 
BEGIN
    -- Check and create triggers with error handling
    BEGIN
        DROP TRIGGER IF EXISTS update_users_updated_at ON users;
        CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    EXCEPTION
        WHEN others THEN
            -- Silently continue if there's an issue
            NULL;
    END;

    BEGIN
        DROP TRIGGER IF EXISTS update_predictions_updated_at ON predictions;
        CREATE TRIGGER update_predictions_updated_at BEFORE UPDATE ON predictions
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    EXCEPTION
        WHEN others THEN
            NULL;
    END;

    BEGIN
        DROP TRIGGER IF EXISTS update_prediction_options_updated_at ON prediction_options;
        CREATE TRIGGER update_prediction_options_updated_at BEFORE UPDATE ON prediction_options
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    EXCEPTION
        WHEN others THEN
            NULL;
    END;

    BEGIN
        DROP TRIGGER IF EXISTS update_wallets_updated_at ON wallets;
        CREATE TRIGGER update_wallets_updated_at BEFORE UPDATE ON wallets
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    EXCEPTION
        WHEN others THEN
            NULL;
    END;

    BEGIN
        DROP TRIGGER IF EXISTS update_clubs_updated_at ON clubs;
        CREATE TRIGGER update_clubs_updated_at BEFORE UPDATE ON clubs
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    EXCEPTION
        WHEN others THEN
            NULL;
    END;

    BEGIN
        DROP TRIGGER IF EXISTS update_prediction_entries_updated_at ON prediction_entries;
        CREATE TRIGGER update_prediction_entries_updated_at BEFORE UPDATE ON prediction_entries
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    EXCEPTION
        WHEN others THEN
            NULL;
    END;
END $$;

-- 12. Create Indexes for Performance (only if they don't exist)
DO $$ 
BEGIN
    -- Create indexes with existence checks
    BEGIN
        CREATE INDEX IF NOT EXISTS predictions_creator_id_idx ON predictions(creator_id);
        CREATE INDEX IF NOT EXISTS predictions_category_idx ON predictions(category);
        CREATE INDEX IF NOT EXISTS predictions_status_idx ON predictions(status);
        CREATE INDEX IF NOT EXISTS predictions_created_at_idx ON predictions(created_at);
        CREATE INDEX IF NOT EXISTS prediction_options_prediction_id_idx ON prediction_options(prediction_id);
        CREATE INDEX IF NOT EXISTS wallet_transactions_user_id_idx ON wallet_transactions(user_id);
        CREATE INDEX IF NOT EXISTS wallet_transactions_created_at_idx ON wallet_transactions(created_at);
        CREATE INDEX IF NOT EXISTS comments_prediction_id_idx ON comments(prediction_id);
        CREATE INDEX IF NOT EXISTS comments_user_id_idx ON comments(user_id);
        CREATE INDEX IF NOT EXISTS reactions_prediction_id_idx ON reactions(prediction_id);
        CREATE INDEX IF NOT EXISTS reactions_user_id_idx ON reactions(user_id);
        CREATE INDEX IF NOT EXISTS prediction_entries_prediction_id_idx ON prediction_entries(prediction_id);
        CREATE INDEX IF NOT EXISTS prediction_entries_user_id_idx ON prediction_entries(user_id);
    EXCEPTION
        WHEN others THEN
            -- Continue if indexes already exist
            NULL;
    END;
END $$;

-- 13. Create default wallet for existing users
INSERT INTO wallets (user_id, currency, available_balance, reserved_balance)
SELECT id, 'NGN', 10000.00, 0.00
FROM users
WHERE id NOT IN (SELECT user_id FROM wallets WHERE currency = 'NGN')
ON CONFLICT (user_id, currency) DO NOTHING;

-- Success message
SELECT 'Database schema setup completed successfully!' AS status;