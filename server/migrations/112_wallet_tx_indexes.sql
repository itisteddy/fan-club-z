-- Migration 112: Wallet Transaction Indexes
-- Optimize queries for wallet summary and activity endpoints

-- Index for user + created_at lookups (activity feed)
CREATE INDEX IF NOT EXISTS idx_wallet_tx_user_created 
  ON wallet_transactions(user_id, created_at DESC);

-- Index for escrow locks user + created_at (activity feed)
CREATE INDEX IF NOT EXISTS idx_escrow_locks_user_created 
  ON escrow_locks(user_id, created_at DESC);

-- Index for provider + channel filtering (wallet summary)
CREATE INDEX IF NOT EXISTS idx_wallet_tx_provider_channel
  ON wallet_transactions(provider, channel)
  WHERE provider IN ('base/usdc', 'crypto-base-usdc') AND channel = 'crypto';

-- Index for prediction entries by user (participation checks)
CREATE INDEX IF NOT EXISTS idx_prediction_entries_user_prediction
  ON prediction_entries(user_id, prediction_id);

