-- Cleanup: Remove demo data and reset wallet balances
-- This migration removes demo transactions and resets wallet snapshots to zero
-- After this, balances will be computed only from crypto transactions

-- Delete all demo provider transactions
DELETE FROM wallet_transactions 
WHERE provider = 'demo';

-- Reset wallet balances to zero (they will be recalculated from transactions)
-- Only reset if you want a clean slate; otherwise balances persist
-- Uncomment the following if you want to reset:
-- UPDATE wallets 
-- SET available_balance = 0, 
--     reserved_balance = 0,
--     updated_at = now()
-- WHERE currency = 'USD';

-- Optional: If you have a legacy wallet summary view that aggregates transactions,
-- ensure it filters by provider:
-- CREATE OR REPLACE VIEW wallet_summary AS
-- SELECT 
--   user_id,
--   currency,
--   COALESCE(SUM(CASE WHEN direction = 'credit' THEN amount ELSE 0 END), 0) -
--   COALESCE(SUM(CASE WHEN direction = 'debit'  THEN amount ELSE 0 END), 0) AS available_balance
-- FROM wallet_transactions
-- WHERE provider IN ('crypto-base-usdc')  -- Only crypto, no demo
-- GROUP BY user_id, currency;

