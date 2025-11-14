-- Check escrow_locks schema
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'escrow_locks'
ORDER BY ordinal_position;

-- Check constraints
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'public.escrow_locks'::regclass;

-- Check current locks
SELECT 
  id,
  user_id,
  prediction_id,
  amount,
  state,
  created_at,
  released_at,
  expires_at,
  lock_ref
FROM escrow_locks
ORDER BY created_at DESC
LIMIT 5;
