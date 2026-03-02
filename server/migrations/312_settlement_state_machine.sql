-- Phase 4A: Add explicit settlement state machine statuses
-- This migration adds new status values to support hybrid pot settlement
-- State machine: offchain_settled -> onchain_finalized (crypto) / demo_paid (demo)

-- Drop the existing check constraint
ALTER TABLE bet_settlements DROP CONSTRAINT IF EXISTS bet_settlements_status_check;

-- Add new status values: 'offchain_settled', 'demo_paid', 'onchain_finalized'
-- Keep existing values for backward compatibility
ALTER TABLE bet_settlements 
ADD CONSTRAINT bet_settlements_status_check 
CHECK (status IN (
  'pending', 
  'computing', 
  'computed', 
  'posting', 
  'onchain_posted', 
  'completed', 
  'failed', 
  'cancelled',
  'offchain_settled',  -- New: Outcome decided, off-chain settlement complete
  'demo_paid',         -- New: Demo rail payouts applied (ledger credits)
  'onchain_finalized'  -- New: On-chain finalize tx complete (crypto rail)
));

-- Add index for faster queries on new statuses
CREATE INDEX IF NOT EXISTS idx_bet_settlements_offchain_settled 
ON bet_settlements(status) 
WHERE status = 'offchain_settled';

CREATE INDEX IF NOT EXISTS idx_bet_settlements_demo_paid 
ON bet_settlements(status) 
WHERE status = 'demo_paid';

CREATE INDEX IF NOT EXISTS idx_bet_settlements_onchain_finalized 
ON bet_settlements(status) 
WHERE status = 'onchain_finalized';

-- Update comment
COMMENT ON COLUMN bet_settlements.status IS 'State machine: pending -> offchain_settled -> (demo_paid | onchain_finalized). Legacy values still supported.';

