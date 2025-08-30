-- Fan Club Z Wallet Functions for Supabase
-- Run this SQL in your Supabase SQL Editor

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

-- Create function to get wallet balance
CREATE OR REPLACE FUNCTION get_wallet_balance(
  user_id UUID,
  currency_code TEXT DEFAULT 'NGN'
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
  VALUES (user_id, currency_code, 0, 0)
  ON CONFLICT (user_id, currency) DO NOTHING;
  
  -- Return wallet balance
  RETURN QUERY
  SELECT 
    w.available_balance,
    w.reserved_balance,
    (w.available_balance + w.reserved_balance) as total_balance
  FROM wallets w
  WHERE w.user_id = get_wallet_balance.user_id AND w.currency = currency_code;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_wallet_balance TO authenticated;

-- Create function to validate sufficient balance
CREATE OR REPLACE FUNCTION has_sufficient_balance(
  user_id UUID,
  currency_code TEXT,
  required_amount DECIMAL(18,8)
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
  WHERE wallets.user_id = has_sufficient_balance.user_id 
    AND wallets.currency = currency_code;
  
  IF current_balance IS NULL THEN
    RETURN FALSE;
  END IF;
  
  RETURN current_balance >= required_amount;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION has_sufficient_balance TO authenticated;

-- Success message
SELECT 'Wallet functions created successfully!' AS status;
