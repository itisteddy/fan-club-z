-- Fan Club Z Wallet Functions for Supabase (FIXED VERSION)
-- Run this SQL in your Supabase SQL Editor

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS update_wallet_balance(UUID, TEXT, DECIMAL, DECIMAL);

-- Create the update_wallet_balance RPC function with fixed parameter names
CREATE OR REPLACE FUNCTION update_wallet_balance(
  p_user_id UUID,
  p_currency_code TEXT DEFAULT 'NGN',
  p_available_change DECIMAL(18,8) DEFAULT 0,
  p_reserved_change DECIMAL(18,8) DEFAULT 0
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
  VALUES (p_user_id, p_currency_code, GREATEST(0, p_available_change), GREATEST(0, p_reserved_change))
  ON CONFLICT (user_id, currency) DO NOTHING;
  
  -- Update the wallet balance atomically
  UPDATE wallets 
  SET 
    available_balance = GREATEST(0, available_balance + p_available_change),
    reserved_balance = GREATEST(0, reserved_balance + p_reserved_change),
    updated_at = NOW()
  WHERE wallets.user_id = p_user_id 
    AND wallets.currency = p_currency_code;
  
  -- Return the updated wallet
  RETURN QUERY
  SELECT w.id, w.user_id, w.currency, w.available_balance, w.reserved_balance, w.updated_at
  FROM wallets w
  WHERE w.user_id = p_user_id AND w.currency = p_currency_code;
END;
$$;

-- Grant permissions to authenticated users
GRANT EXECUTE ON FUNCTION update_wallet_balance TO authenticated;

-- Create function to get wallet balance
CREATE OR REPLACE FUNCTION get_wallet_balance(
  p_user_id UUID,
  p_currency_code TEXT DEFAULT 'NGN'
)
RETURNS TABLE(
  available_balance DECIMAL(18,8),
  reserved_balance DECIMAL(18,8),
  total_balance DECIMAL(18,8)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Create wallet if it doesn't exist
  INSERT INTO wallets (user_id, currency, available_balance, reserved_balance)
  VALUES (p_user_id, p_currency_code, 0, 0)
  ON CONFLICT (user_id, currency) DO NOTHING;
  
  -- Return wallet balance
  RETURN QUERY
  SELECT 
    w.available_balance,
    w.reserved_balance,
    (w.available_balance + w.reserved_balance) as total_balance
  FROM wallets w
  WHERE w.user_id = p_user_id AND w.currency = p_currency_code;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_wallet_balance TO authenticated;

-- Create function to validate sufficient balance
CREATE OR REPLACE FUNCTION has_sufficient_balance(
  p_user_id UUID,
  p_currency_code TEXT,
  p_required_amount DECIMAL(18,8)
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_balance DECIMAL(18,8);
BEGIN
  SELECT available_balance INTO current_balance
  FROM wallets
  WHERE wallets.user_id = p_user_id 
    AND wallets.currency = p_currency_code;
  
  IF current_balance IS NULL THEN
    RETURN FALSE;
  END IF;
  
  RETURN current_balance >= p_required_amount;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION has_sufficient_balance TO authenticated;

-- Test the function to make sure it works
DO $$
DECLARE
  test_user_id UUID;
  result_record RECORD;
BEGIN
  -- Get a test user ID from existing users
  SELECT id INTO test_user_id FROM users LIMIT 1;
  
  IF test_user_id IS NOT NULL THEN
    -- Test the function
    SELECT * INTO result_record FROM update_wallet_balance(test_user_id, 'NGN', 0, 0);
    RAISE NOTICE 'Function test successful for user: %', test_user_id;
  ELSE
    RAISE NOTICE 'No users found to test with, but function created successfully';
  END IF;
END;
$$;

-- Success message
SELECT 'Wallet functions created successfully!' AS status;
