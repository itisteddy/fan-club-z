-- Migration 111: Wallet Summary View
-- Computes wallet balances from transactions and escrow locks
-- Filters by crypto provider (no demo data)

CREATE OR REPLACE VIEW v_wallet_summary AS
SELECT
  u.id AS user_id,
  COALESCE(
    SUM(
      CASE 
        WHEN wt.type = 'credit' OR wt.direction = 'credit' THEN wt.amount
        WHEN wt.type = 'debit' OR wt.direction = 'debit' THEN -wt.amount
        ELSE 0
      END
    ),
    0
  )::numeric(14, 2) AS wallet_usdc,
  COALESCE(
    (SELECT SUM(amount)::numeric(14, 2) 
     FROM escrow_locks el 
     WHERE el.user_id = u.id 
       AND (el.status IN ('locked', 'consumed') OR el.state IN ('locked', 'consumed'))
    ),
    0
  ) AS escrow_usdc,
  COALESCE(
    (SELECT SUM(amount)::numeric(14, 2) 
     FROM escrow_locks el 
     WHERE el.user_id = u.id 
       AND (el.status = 'locked' OR el.state = 'locked')
    ),
    0
  ) AS reserved_usdc
FROM users u
LEFT JOIN wallet_transactions wt 
  ON wt.user_id = u.id 
  AND wt.channel = 'crypto' 
  AND wt.provider IN ('base/usdc', 'crypto-base-usdc')
GROUP BY u.id;

-- Add comment for documentation
COMMENT ON VIEW v_wallet_summary IS 'Normalized wallet summary from transactions and escrow locks. Filters crypto provider only (no demo).';

