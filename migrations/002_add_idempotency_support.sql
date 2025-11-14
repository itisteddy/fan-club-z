-- Migration: Add idempotency support and improve transaction tracking
-- Run this migration to enable duplicate prevention and better balance tracking

-- 1. Create idempotency_keys table for preventing duplicate requests
CREATE TABLE IF NOT EXISTS idempotency_keys (
  key VARCHAR(255) PRIMARY KEY,
  status VARCHAR(50) NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed')),
  status_code INTEGER,
  response JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add index for cleanup queries
CREATE INDEX IF NOT EXISTS idx_idempotency_created ON idempotency_keys(created_at);
CREATE INDEX IF NOT EXISTS idx_idempotency_status ON idempotency_keys(status);

-- 2. Add idempotency support to wallet_transactions
ALTER TABLE wallet_transactions 
ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(255) UNIQUE,
ADD COLUMN IF NOT EXISTS prediction_id UUID REFERENCES predictions(id),
ADD COLUMN IF NOT EXISTS entry_id UUID REFERENCES prediction_entries(id),
ADD COLUMN IF NOT EXISTS gas_used DECIMAL(10, 6),
ADD COLUMN IF NOT EXISTS gas_price DECIMAL(10, 6);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_prediction 
  ON wallet_transactions(prediction_id) 
  WHERE prediction_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_type 
  ON wallet_transactions(user_id, type);

CREATE INDEX IF NOT EXISTS idx_wallet_transactions_idempotency 
  ON wallet_transactions(idempotency_key) 
  WHERE idempotency_key IS NOT NULL;

-- 3. Add settlement tracking to predictions
ALTER TABLE predictions
ADD COLUMN IF NOT EXISTS settlement_tx_hash VARCHAR(255),
ADD COLUMN IF NOT EXISTS settled_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS settlement_metadata JSONB;

-- Add index for settlement queries
CREATE INDEX IF NOT EXISTS idx_predictions_settlement 
  ON predictions(settled_at) 
  WHERE settled_at IS NOT NULL;

-- 4. Add actual payout tracking to prediction_entries
ALTER TABLE prediction_entries
ADD COLUMN IF NOT EXISTS actual_payout DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS payout_tx_hash VARCHAR(255),
ADD COLUMN IF NOT EXISTS settled_at TIMESTAMP;

-- 5. Create function to automatically clean up old idempotency keys
CREATE OR REPLACE FUNCTION cleanup_old_idempotency_keys()
RETURNS void AS $$
BEGIN
  DELETE FROM idempotency_keys 
  WHERE created_at < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql;

-- 6. Create a function to ensure balance consistency
CREATE OR REPLACE FUNCTION check_balance_consistency(p_user_id UUID)
RETURNS TABLE(
  wallet_balance DECIMAL,
  transaction_sum DECIMAL,
  is_consistent BOOLEAN
) AS $$
DECLARE
  v_wallet_balance DECIMAL;
  v_transaction_sum DECIMAL;
BEGIN
  -- Get current wallet balance
  SELECT available_balance INTO v_wallet_balance
  FROM wallets
  WHERE user_id = p_user_id
  AND currency = 'USD';
  
  -- Calculate sum from transactions
  SELECT 
    COALESCE(SUM(
      CASE 
        WHEN direction = 'credit' THEN amount
        WHEN direction = 'debit' THEN -amount
        ELSE 0
      END
    ), 0) INTO v_transaction_sum
  FROM wallet_transactions
  WHERE user_id = p_user_id
  AND status = 'completed';
  
  RETURN QUERY
  SELECT 
    v_wallet_balance,
    v_transaction_sum,
    ABS(v_wallet_balance - v_transaction_sum) < 0.01;
END;
$$ LANGUAGE plpgsql;

-- 7. Create trigger to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to idempotency_keys table
DROP TRIGGER IF EXISTS update_idempotency_keys_updated_at ON idempotency_keys;
CREATE TRIGGER update_idempotency_keys_updated_at
  BEFORE UPDATE ON idempotency_keys
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- 8. Add constraint to prevent negative balances (if not already present)
ALTER TABLE wallets 
ADD CONSTRAINT check_positive_balance 
CHECK (available_balance >= 0);

-- 9. Create view for easy balance reconciliation
CREATE OR REPLACE VIEW v_user_balance_summary AS
SELECT 
  u.id as user_id,
  u.email,
  w.available_balance,
  w.reserved_balance,
  w.currency,
  COUNT(DISTINCT pe.id) as active_predictions,
  COALESCE(SUM(pe.amount), 0) as total_staked,
  MAX(wt.created_at) as last_transaction_at
FROM 
  users u
  LEFT JOIN wallets w ON u.id = w.user_id AND w.currency = 'USD'
  LEFT JOIN prediction_entries pe ON u.id = pe.user_id AND pe.status = 'active'
  LEFT JOIN wallet_transactions wt ON u.id = wt.user_id
GROUP BY 
  u.id, u.email, w.available_balance, w.reserved_balance, w.currency;

-- 10. Add comment documentation
COMMENT ON TABLE idempotency_keys IS 'Stores idempotency keys to prevent duplicate transaction processing';
COMMENT ON COLUMN idempotency_keys.key IS 'Unique identifier for the request';
COMMENT ON COLUMN idempotency_keys.status IS 'Current status of request processing';
COMMENT ON COLUMN idempotency_keys.response IS 'Cached response for completed requests';

COMMENT ON COLUMN wallet_transactions.idempotency_key IS 'Links transaction to idempotency key for duplicate prevention';
COMMENT ON COLUMN wallet_transactions.prediction_id IS 'Links transaction to specific prediction if applicable';
COMMENT ON COLUMN wallet_transactions.entry_id IS 'Links transaction to specific prediction entry if applicable';

-- Grant permissions (adjust based on your user setup)
GRANT SELECT, INSERT, UPDATE ON idempotency_keys TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_old_idempotency_keys() TO service_role;
GRANT EXECUTE ON FUNCTION check_balance_consistency(UUID) TO authenticated;

-- Output success message
DO $$ 
BEGIN 
  RAISE NOTICE 'Idempotency and balance tracking migration completed successfully';
END $$;
