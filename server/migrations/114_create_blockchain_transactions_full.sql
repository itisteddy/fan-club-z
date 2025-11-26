-- Migration: Create blockchain_transactions table
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS blockchain_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tx_hash TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  wallet_address TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('deposit', 'withdraw', 'approval', 'stake', 'settlement', 'claim', 'bet_lock', 'bet_release', 'post_root', 'fee')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'failed')),
  amount NUMERIC(20, 6) DEFAULT 0,
  error_message TEXT,
  block_number BIGINT,
  gas_used BIGINT,
  gas_price BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_blockchain_tx_user_id ON blockchain_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_blockchain_tx_hash ON blockchain_transactions(tx_hash);
CREATE INDEX IF NOT EXISTS idx_blockchain_tx_status ON blockchain_transactions(status);
CREATE INDEX IF NOT EXISTS idx_blockchain_tx_type ON blockchain_transactions(type);
CREATE INDEX IF NOT EXISTS idx_blockchain_tx_created_at ON blockchain_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_blockchain_tx_wallet ON blockchain_transactions(wallet_address);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_blockchain_transactions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_blockchain_transactions_updated_at ON blockchain_transactions;
CREATE TRIGGER trigger_blockchain_transactions_updated_at
  BEFORE UPDATE ON blockchain_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_blockchain_transactions_updated_at();

-- RLS
ALTER TABLE blockchain_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own blockchain transactions" ON blockchain_transactions;
CREATE POLICY "Users can view own blockchain transactions"
  ON blockchain_transactions FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can insert blockchain transactions" ON blockchain_transactions;
CREATE POLICY "Service role can insert blockchain transactions"
  ON blockchain_transactions FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can update blockchain transactions" ON blockchain_transactions;
CREATE POLICY "Service role can update blockchain transactions"
  ON blockchain_transactions FOR UPDATE USING (true);
