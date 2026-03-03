-- Migration: Update blockchain_transactions table type CHECK constraint
-- Adds missing transaction types: bet_lock, bet_release, post_root, fee
-- Only run if table exists (table is created in 114; this migration may run before 114 on fresh DBs)

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'blockchain_transactions') THEN
    ALTER TABLE blockchain_transactions DROP CONSTRAINT IF EXISTS blockchain_transactions_type_check;
    ALTER TABLE blockchain_transactions ADD CONSTRAINT blockchain_transactions_type_check 
      CHECK (type IN ('deposit', 'withdraw', 'approval', 'stake', 'settlement', 'claim', 'bet_lock', 'bet_release', 'post_root', 'fee'));
    COMMENT ON COLUMN blockchain_transactions.type IS 'Type of transaction: deposit, withdraw, approval, stake, settlement, claim, bet_lock, bet_release, post_root, fee';
  END IF;
END $$;
