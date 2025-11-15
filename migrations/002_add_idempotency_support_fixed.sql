-- Migration: Add idempotency support and improve transaction tracking
-- Run this migration to enable duplicate prevention and better balance tracking
-- FIXED VERSION - Corrects the wallet_address reference error

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

-- 2. First ensure wallet_transactions table has proper structure
-- Check if wallet_address column exists, if not add it
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'wallet_transactions' 
    AND column_name = 'wallet_address'
  ) THEN
    ALTER TABLE wallet_transactions ADD COLUMN wallet_address VARCHAR(255);
  END IF;
END $$;

-- Now add idempotency support to wallet_transactions
ALTER TABLE wallet_transactions 
ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(255) UNIQUE,
ADD COLUMN IF NOT EXISTS prediction_id UUID,
ADD COLUMN IF NOT EXISTS entry_id UUID,
ADD COLUMN IF NOT EXISTS gas_used DECIMAL(10, 6),
ADD COLUMN IF NOT EXISTS gas_price DECIMAL(10, 6);

-- Add foreign key constraints only if the referenced tables exist
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'predictions') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'wallet_transactions_prediction_id_fkey'
    ) THEN
      ALTER TABLE wallet_transactions 
      ADD CONSTRAINT wallet_transactions_prediction_id_fkey 
      FOREIGN KEY (prediction_id) REFERENCES predictions(id);
    END IF;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'prediction_entries') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'wallet_transactions_entry_id_fkey'
    ) THEN
      ALTER TABLE wallet_transactions 
      ADD CONSTRAINT wallet_transactions_entry_id_fkey 
      FOREIGN KEY (entry_id) REFERENCES prediction_entries(id);
    END IF;
  END IF;
END $$;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_prediction 
  ON wallet_transactions(prediction_id) 
  WHERE prediction_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_type 
  ON wallet_transactions(user_id, type);

CREATE INDEX IF NOT EXISTS idx_wallet_transactions_idempotency 
  ON wallet_transactions(idempotency_key) 
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_wallet_transactions_wallet_address
  ON wallet_transactions(wallet_address)
  WHERE wallet_address IS NOT NULL;

-- 3. Add settlement tracking to predictions
ALTER TABLE predictions
ADD COLUMN IF NOT EXISTS settlement_tx_hash VARCHAR(255),
ADD COLUMN IF NOT EXISTS settled_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS settlement_metadata JSONB,
ADD COLUMN IF NOT EXISTS winning_option_id UUID;

-- Add index for settlement queries
CREATE INDEX IF NOT EXISTS idx_predictions_settlement 
  ON predictions(settled_at) 
  WHERE settled_at IS NOT NULL;

-- 4. Add actual payout tracking to prediction_entries
ALTER TABLE prediction_entries
ADD COLUMN IF NOT EXISTS actual_payout DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS payout_tx_hash VARCHAR(255),
ADD COLUMN IF NOT EXISTS settled_at TIMESTAMP;

-- 5. Create realtime_subscriptions table (FIXED - removed wallet_address reference)
CREATE TABLE IF NOT EXISTS realtime_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  socket_id VARCHAR(255) NOT NULL,
  channel VARCHAR(100) NOT NULL,
  subscribed_at TIMESTAMP DEFAULT NOW(),
  last_ping TIMESTAMP DEFAULT NOW()
);

-- Create indexes for realtime_subscriptions
CREATE INDEX IF NOT EXISTS idx_realtime_subs_user ON realtime_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_realtime_subs_socket ON realtime_subscriptions(socket_id);

-- 6. Create function to automatically clean up old idempotency keys
CREATE OR REPLACE FUNCTION cleanup_old_idempotency_keys()
RETURNS void AS $$
BEGIN
  DELETE FROM idempotency_keys 
  WHERE created_at < NOW() - INTERVAL '24 hours';
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

-- 8. Remove deprecated wallet balance columns (use on-chain only)
-- First check if columns exist before dropping
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'wallets' 
    AND column_name = 'available_balance'
  ) THEN
    -- Remove the constraint first if it exists
    ALTER TABLE wallets DROP CONSTRAINT IF EXISTS check_positive_balance;
    -- Now we can safely alter the columns
    -- Note: We're keeping these columns but marking them as deprecated
    -- They will be removed in a future migration after ensuring all code is updated
    COMMENT ON COLUMN wallets.available_balance IS 'DEPRECATED - Use on-chain balance from escrow contract';
    COMMENT ON COLUMN wallets.reserved_balance IS 'DEPRECATED - Use on-chain reserved from escrow contract';
  END IF;
END $$;

-- 9. Add comment documentation
COMMENT ON TABLE idempotency_keys IS 'Stores idempotency keys to prevent duplicate transaction processing';
COMMENT ON COLUMN idempotency_keys.key IS 'Unique identifier for the request';
COMMENT ON COLUMN idempotency_keys.status IS 'Current status of request processing';
COMMENT ON COLUMN idempotency_keys.response IS 'Cached response for completed requests';

COMMENT ON COLUMN wallet_transactions.idempotency_key IS 'Links transaction to idempotency key for duplicate prevention';
COMMENT ON COLUMN wallet_transactions.prediction_id IS 'Links transaction to specific prediction if applicable';
COMMENT ON COLUMN wallet_transactions.entry_id IS 'Links transaction to specific prediction entry if applicable';

-- 10. Grant appropriate permissions
GRANT SELECT, INSERT, UPDATE ON idempotency_keys TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON realtime_subscriptions TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_old_idempotency_keys() TO authenticated;
GRANT EXECUTE ON FUNCTION update_updated_at() TO authenticated;

-- Output success message
DO $$ 
BEGIN 
  RAISE NOTICE 'Idempotency and balance tracking migration completed successfully';
END $$;
