-- Fan Club Z - Prediction Placement Fix Migration (FIXED VERSION)
-- Run this SQL in your Supabase SQL Editor to fix prediction placement issues

-- 1. First, run the wallet functions (already fixed in separate file)
-- This script assumes supabase-wallet-functions-fixed.sql has been run

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
    -- Try to drop existing constraint
    ALTER TABLE wallet_transactions 
    DROP CONSTRAINT IF EXISTS wallet_transactions_type_check;
  EXCEPTION
    WHEN others THEN
      -- Continue if constraint doesn't exist
      NULL;
  END;
  
  -- Add the updated constraint
  ALTER TABLE wallet_transactions 
  ADD CONSTRAINT wallet_transactions_type_check 
  CHECK (type IN ('deposit', 'withdraw', 'bet_lock', 'bet_release', 'transfer_in', 'transfer_out', 'fee', 'creator_payout', 'prediction_lock'));
END $$;

-- 8. Create index on prediction_entries for better performance
CREATE INDEX IF NOT EXISTS prediction_entries_prediction_user_idx 
ON prediction_entries(prediction_id, user_id);

-- 9. Create helper function to recalculate prediction odds
CREATE OR REPLACE FUNCTION recalculate_prediction_odds(p_prediction_id UUID)
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
  WHERE id = p_prediction_id;
  
  -- Update odds for each option
  FOR option_record IN 
    SELECT id, total_staked 
    FROM prediction_options 
    WHERE prediction_options.prediction_id = p_prediction_id
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

-- 11. Update default currency in table definitions (for future records)
-- Note: This updates the column default, existing records are already updated above
DO $$
BEGIN
  BEGIN
    ALTER TABLE wallets ALTER COLUMN currency SET DEFAULT 'NGN';
    ALTER TABLE wallet_transactions ALTER COLUMN currency SET DEFAULT 'NGN';
  EXCEPTION
    WHEN others THEN
      -- Continue if columns don't exist or can't be modified
      RAISE NOTICE 'Could not update default currency - this is okay if using existing schema';
  END;
END $$;

-- 12. Verify the setup by checking a few things
DO $$
DECLARE
  wallet_count INTEGER;
  ngn_wallet_count INTEGER;
  function_exists BOOLEAN;
BEGIN
  -- Check wallet counts
  SELECT COUNT(*) INTO wallet_count FROM wallets;
  SELECT COUNT(*) INTO ngn_wallet_count FROM wallets WHERE currency = 'NGN';
  
  -- Check if our RPC function exists
  SELECT EXISTS(
    SELECT 1 FROM pg_proc 
    WHERE proname = 'update_wallet_balance'
  ) INTO function_exists;
  
  RAISE NOTICE 'Migration completed successfully!';
  RAISE NOTICE 'Total wallets: %, NGN wallets: %', wallet_count, ngn_wallet_count;
  RAISE NOTICE 'update_wallet_balance function exists: %', function_exists;
END $$;

-- Success message
SELECT 'Prediction placement fix migration completed successfully!' AS status;
