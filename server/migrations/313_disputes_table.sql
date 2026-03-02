-- Phase 4D: Create disputes table for settlement disputes
-- Users can dispute settled predictions, admins can resolve them

CREATE TABLE IF NOT EXISTS disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prediction_id UUID NOT NULL REFERENCES predictions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  reason VARCHAR(50) NOT NULL CHECK (reason IN ('source_updated', 'wrong_source', 'timing', 'other')),
  evidence_url TEXT,
  evidence JSONB DEFAULT '[]', -- Array of {type: 'link'|'image', value: string}
  status VARCHAR(50) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'under_review', 'resolved', 'rejected')),
  resolution_note TEXT,
  resolved_by_user_id UUID REFERENCES public.users(id),
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- If disputes table already existed (older schema), ensure required columns exist.
-- This fixes Supabase errors like: column "user_id" does not exist.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'disputes' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.disputes ADD COLUMN user_id UUID;
  END IF;

  -- Common older schema uses opened_by instead of user_id. Backfill if present.
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'disputes' AND column_name = 'opened_by'
  ) THEN
    UPDATE public.disputes
      SET user_id = opened_by
      WHERE user_id IS NULL AND opened_by IS NOT NULL;
  END IF;

  -- Ensure evidence JSONB exists for newer API usage (optional backfill)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'disputes' AND column_name = 'evidence'
  ) THEN
    ALTER TABLE public.disputes ADD COLUMN evidence JSONB DEFAULT '[]';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'disputes' AND column_name = 'evidence_url'
  ) THEN
    ALTER TABLE public.disputes ADD COLUMN evidence_url TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'disputes' AND column_name = 'resolution_note'
  ) THEN
    ALTER TABLE public.disputes ADD COLUMN resolution_note TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'disputes' AND column_name = 'resolved_by_user_id'
  ) THEN
    ALTER TABLE public.disputes ADD COLUMN resolved_by_user_id UUID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'disputes' AND column_name = 'resolved_at'
  ) THEN
    ALTER TABLE public.disputes ADD COLUMN resolved_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'disputes' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE public.disputes ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'disputes' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.disputes ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;

  -- Handle status column (old schema uses 'state', new uses 'status')
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'disputes' AND column_name = 'status'
  ) THEN
    -- Check if old 'state' column exists
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'disputes' AND column_name = 'state'
    ) THEN
      -- Add status column and migrate data from state
      ALTER TABLE public.disputes ADD COLUMN status VARCHAR(50);
      -- Map old state values to new status values
      UPDATE public.disputes SET status = CASE
        WHEN state = 'open' THEN 'open'
        WHEN state = 'under_review' THEN 'under_review'
        WHEN state = 'upheld' THEN 'resolved'
        WHEN state = 'overturned' THEN 'rejected'
        ELSE 'open'
      END;
      -- Set default for any NULL values
      UPDATE public.disputes SET status = 'open' WHERE status IS NULL;
      ALTER TABLE public.disputes ALTER COLUMN status SET NOT NULL;
      ALTER TABLE public.disputes ALTER COLUMN status SET DEFAULT 'open';
    ELSE
      -- No state column, just add status with default
      ALTER TABLE public.disputes ADD COLUMN status VARCHAR(50) NOT NULL DEFAULT 'open';
    END IF;
  END IF;

  -- Ensure status has proper constraint
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name LIKE '%disputes_status%'
  ) THEN
    ALTER TABLE public.disputes DROP CONSTRAINT IF EXISTS disputes_status_check;
    ALTER TABLE public.disputes ADD CONSTRAINT disputes_status_check 
      CHECK (status IN ('open', 'under_review', 'resolved', 'rejected'));
  END IF;
END $$;

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_disputes_prediction_id ON disputes(prediction_id);
CREATE INDEX IF NOT EXISTS idx_disputes_user_id ON disputes(user_id);
CREATE INDEX IF NOT EXISTS idx_disputes_status ON disputes(status);
CREATE INDEX IF NOT EXISTS idx_disputes_created_at ON disputes(created_at DESC);

-- RLS policies
ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;

-- Drop policies if they exist (for idempotency)
DROP POLICY IF EXISTS "disputes_read_own" ON disputes;
DROP POLICY IF EXISTS "disputes_create_own" ON disputes;
DROP POLICY IF EXISTS "disputes_write_service" ON disputes;

-- Allow users to read their own disputes and disputes for predictions they participated in
CREATE POLICY "disputes_read_own" ON disputes 
  FOR SELECT USING (
    auth.uid()::text = user_id::text OR
    EXISTS (
      SELECT 1 FROM prediction_entries 
      WHERE prediction_entries.prediction_id = disputes.prediction_id 
      AND prediction_entries.user_id::text = auth.uid()::text
    )
  );

-- Allow users to create disputes for predictions they participated in
CREATE POLICY "disputes_create_own" ON disputes 
  FOR INSERT WITH CHECK (
    auth.uid()::text = user_id::text AND
    EXISTS (
      SELECT 1 FROM prediction_entries 
      WHERE prediction_entries.prediction_id = disputes.prediction_id 
      AND prediction_entries.user_id::text = auth.uid()::text
    )
  );

-- Allow service role to manage all disputes (for admin resolution)
CREATE POLICY "disputes_write_service" ON disputes 
  FOR ALL USING (true);

-- Comment
COMMENT ON TABLE disputes IS 'Tracks disputes for settled predictions. Users can dispute, admins can resolve.';

