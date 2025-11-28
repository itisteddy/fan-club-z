-- CLEANUP OLD ESCROW LOCKS
-- Run this in Supabase SQL Editor to clear stale locks from old escrow contract
-- This allows the new escrow contract balance to be the source of truth

-- First, let's see what we have
SELECT 
  state,
  status,
  COUNT(*) as count,
  SUM(amount) as total_amount
FROM escrow_locks
GROUP BY state, status;

-- Release all consumed locks that are from settled predictions
-- These are bets that were placed and the prediction has been settled
UPDATE escrow_locks
SET 
  state = 'released',
  status = 'released',
  released_at = NOW()
WHERE state = 'consumed' OR status = 'consumed';

-- Release all expired locks
UPDATE escrow_locks
SET 
  state = 'released',
  status = 'released',
  released_at = NOW()
WHERE 
  (state = 'locked' OR status = 'locked')
  AND expires_at < NOW();

-- Verify the cleanup
SELECT 
  state,
  status,
  COUNT(*) as count,
  SUM(amount) as total_amount
FROM escrow_locks
GROUP BY state, status;

-- After running this, the server will use the on-chain balance directly
-- without subtracting stale consumed locks from the old contract

