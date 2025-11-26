-- Migration: Create blockchain_transactions table for tracking on-chain transactions
-- This table stores all blockchain transaction details for auditing and activity tracking

CREATE TABLE IF NOT EXISTS blockchain_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tx_hash TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  wallet_address TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('deposit', 'withdraw', 'approval', 'stake', 'settlement', 'claim')),
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

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_blockchain_tx_user_id ON blockchain_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_blockchain_tx_hash ON blockchain_transactions(tx_hash);
CREATE INDEX IF NOT EXISTS idx_blockchain_tx_status ON blockchain_transactions(status);
CREATE INDEX IF NOT EXISTS idx_blockchain_tx_type ON blockchain_transactions(type);
CREATE INDEX IF NOT EXISTS idx_blockchain_tx_created_at ON blockchain_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_blockchain_tx_wallet ON blockchain_transactions(wallet_address);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_blockchain_transactions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_blockchain_transactions_updated_at
  BEFORE UPDATE ON blockchain_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_blockchain_transactions_updated_at();

-- Add RLS policies
ALTER TABLE blockchain_transactions ENABLE ROW LEVEL SECURITY;

-- Users can view their own transactions
CREATE POLICY "Users can view own blockchain transactions"
  ON blockchain_transactions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can insert transactions
CREATE POLICY "Service role can insert blockchain transactions"
  ON blockchain_transactions
  FOR INSERT
  WITH CHECK (true);

-- Service role can update transactions
CREATE POLICY "Service role can update blockchain transactions"
  ON blockchain_transactions
  FOR UPDATE
  USING (true);

COMMENT ON TABLE blockchain_transactions IS 'Tracks all blockchain transactions for auditing and activity feeds';
COMMENT ON COLUMN blockchain_transactions.tx_hash IS 'Blockchain transaction hash (unique identifier)';
COMMENT ON COLUMN blockchain_transactions.type IS 'Type of transaction: deposit, withdraw, approval, stake, settlement, claim';
COMMENT ON COLUMN blockchain_transactions.status IS 'Transaction status: pending, completed, failed';
COMMENT ON COLUMN blockchain_transactions.amount IS 'Transaction amount in USDC (6 decimals)';
COMMENT ON COLUMN blockchain_transactions.metadata IS 'Additional transaction metadata (contract address, function called, etc.)';
