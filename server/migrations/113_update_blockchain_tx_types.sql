-- Migration: Update blockchain_transactions table type CHECK constraint
-- Adds missing transaction types: bet_lock, bet_release, post_root, fee

-- Drop and recreate the CHECK constraint to add new types
ALTER TABLE blockchain_transactions DROP CONSTRAINT IF EXISTS blockchain_transactions_type_check;

ALTER TABLE blockchain_transactions ADD CONSTRAINT blockchain_transactions_type_check 
  CHECK (type IN ('deposit', 'withdraw', 'approval', 'stake', 'settlement', 'claim', 'bet_lock', 'bet_release', 'post_root', 'fee'));

-- Ensure all transaction types that might be inserted are allowed
COMMENT ON COLUMN blockchain_transactions.type IS 'Type of transaction: deposit, withdraw, approval, stake, settlement, claim, bet_lock, bet_release, post_root, fee';
