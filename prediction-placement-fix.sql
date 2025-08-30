-- Fan Club Z - Prediction Placement Fix Migration
-- Run this SQL in your Supabase SQL Editor to fix prediction placement issues

-- 1. First, run the wallet functions
-- Create the update_wallet_balance RPC function
CREATE OR REPLACE FUNCTION update_wallet_balance(
  user_id UUID,
  currency_code TEXT DEFAULT 'NGN',
  available_change DECIMAL(18,8) DEFAULT 0,
  reserved_change DECIMAL(18,8) DEFAULT 0
) 
RETURNS TABLE(
  id UUID,
  user_id UUID,
  currency TEXT,
  available_balance DECIMAL(18,8),
  reserved_balance DECIMAL(18,8),
  updated_at TIMESTAMP WITH TIME ZONE
) 
LANGUAGE plpgsql 
SECURITY DEFINER
AS $$
BEGIN
  -- Create wallet if it doesn't exist
  INSERT INTO wallets (user_id, currency, available_balance, reserved_balance)
  VALUES (user_id, currency_code, GREATEST(0, available_change), GREATEST(0, reserved_change))
  ON CONFLICT (user_id, currency) DO NOTHING;
  
  -- Update the wallet balance atomically
  UPDATE wallets 
  SET 
    available_balance = GREATEST(0, available_balance + available_change),
    reserved_balance = GREATEST(0, reserved_balance + reserved_change),
    updated_at = NOW()
  WHERE wallets.user_id = update_wallet_balance.user_id 
    AND wallets.currency = currency_code;
  
  -- Return the updated wallet
  RETURN QUERY
  SELECT w.id, w.user_id, w.currency, w.available_balance, w.reserved_balance, w.updated_at
  FROM wallets w
  WHERE w.user_id = update_wallet_balance.user_id AND w.currency = currency_code;
END;
$$;

-- Grant permissions to authenticated users
GRANT EXECUTE ON FUNCTION update_wallet_balance TO authenticated;

-- 2. Update existing USD wallets to NGN
UPDATE wallets 
SET currency = 'NGN' 
WHERE currency = 'USD';

-- 3. Update existing wallet transactions to NGN
UPDATE wallet_transactions 
SET currency = 'NGN' 
WHERE currency = 'USD';

-- 4. Create NGN wallets for users who don't have them
INSERT INTO wallets (user_id, currency, available_balance, reserved_balance)
SELECT u.id, 'NGN', 25000.00, 0.00
FROM users u
WHERE u.id NOT IN (SELECT w.user_id FROM wallets w WHERE w.currency = 'NGN')
ON CONFLICT (user_id, currency) DO NOTHING;

-- 5. Add participant_count column to predictions table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name='predictions' and column_name='participant_count'
    ) THEN
        ALTER TABLE predictions ADD COLUMN participant_count INTEGER DEFAULT 0;
    END IF;
END $$;

-- 6. Update participant_count for existing predictions
UPDATE predictions 
SET participant_count = (
  SELECT COUNT(DISTINCT user_id) 
  FROM prediction_entries 
  WHERE prediction_entries.prediction_id = predictions.id
);

-- 7. Fix transaction types - add prediction_lock if not exists
DO $$
BEGIN
  BEGIN
    ALTER TABLE wallet_transactions 
    DROP CONSTRAINT IF EXISTS wallet_transactions_type_check;
    
    ALTER TABLE wallet_transactions 
    ADD CONSTRAINT wallet_transactions_type_check 
    CHECK (type IN ('deposit', 'withdraw', 'bet_lock', 'bet_release', 'transfer_in', 'transfer_out', 'fee', 'creator_payout', 'prediction_lock'));
  EXCEPTION
    WHEN duplicate_object THEN
      -- Constraint already exists, continue
      NULL;
    WHEN others THEN
      -- Try to create the constraint
      ALTER TABLE wallet_transactions 
      ADD CONSTRAINT wallet_transactions_type_check 
      CHECK (type IN ('deposit', 'withdraw', 'bet_lock', 'bet_release', 'transfer_in', 'transfer_out', 'fee', 'creator_payout', 'prediction_lock'));
  END;
END $$;

-- 8. Create index on prediction_entries for better performance
CREATE INDEX IF NOT EXISTS prediction_entries_prediction_user_idx 
ON prediction_entries(prediction_id, user_id);

-- 9. Create helper function to recalculate prediction odds
CREATE OR REPLACE FUNCTION recalculate_prediction_odds(prediction_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  total_pool DECIMAL(18,8);
  option_record RECORD;
  new_odds DECIMAL(18,8);
BEGIN
  -- Get total pool for the prediction
  SELECT pool_total INTO total_pool
  FROM predictions
  WHERE id = prediction_id;
  
  -- Update odds for each option
  FOR option_record IN 
    SELECT id, total_staked 
    FROM prediction_options 
    WHERE prediction_options.prediction_id = recalculate_prediction_odds.prediction_id
  LOOP
    -- Calculate new odds
    IF option_record.total_staked = 0 OR total_pool = 0 THEN
      new_odds := 1.0;
    ELSE
      new_odds := GREATEST(1.0, total_pool / option_record.total_staked);
    END IF;
    
    -- Update the option
    UPDATE prediction_options
    SET current_odds = new_odds,
        updated_at = NOW()
    WHERE id = option_record.id;
  END LOOP;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION recalculate_prediction_odds TO authenticated;

-- 10. Recalculate odds for all active predictions
DO $$
DECLARE
  pred_record RECORD;
BEGIN
  FOR pred_record IN SELECT id FROM predictions WHERE status IN ('open', 'pending') LOOP
    PERFORM recalculate_prediction_odds(pred_record.id);
  END LOOP;
END $$;

-- Success message
SELECT 'Prediction placement fix migration completed successfully!' AS status;
