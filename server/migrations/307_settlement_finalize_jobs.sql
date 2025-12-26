-- Settlement finalization jobs + minimal admin audit log
-- Supports admin relayer pipeline so creators don't need a wallet to finalize.

CREATE TABLE IF NOT EXISTS settlement_finalize_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prediction_id UUID NOT NULL REFERENCES predictions(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'finalized', 'failed')),
  tx_hash TEXT NULL,
  error TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_settlement_finalize_jobs_prediction_id ON settlement_finalize_jobs(prediction_id);

-- Prevent duplicate active jobs
CREATE UNIQUE INDEX IF NOT EXISTS uq_settlement_finalize_jobs_active
  ON settlement_finalize_jobs(prediction_id)
  WHERE status IN ('queued', 'running');

CREATE TABLE IF NOT EXISTS admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  target_id UUID NULL,
  meta JSONB NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_actor_id ON admin_audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created_at ON admin_audit_log(created_at DESC);

-- RLS
ALTER TABLE settlement_finalize_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Read allowed for all authenticated users (app enforces visibility at API layer)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'settlement_finalize_jobs' AND policyname = 'settlement_finalize_jobs_read_all'
  ) THEN
    CREATE POLICY "settlement_finalize_jobs_read_all" ON settlement_finalize_jobs
      FOR SELECT USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'admin_audit_log' AND policyname = 'admin_audit_log_read_all'
  ) THEN
    CREATE POLICY "admin_audit_log_read_all" ON admin_audit_log
      FOR SELECT USING (true);
  END IF;
END $$;

-- Service role can write
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'settlement_finalize_jobs' AND policyname = 'settlement_finalize_jobs_write_service'
  ) THEN
    CREATE POLICY "settlement_finalize_jobs_write_service" ON settlement_finalize_jobs
      FOR ALL USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'admin_audit_log' AND policyname = 'admin_audit_log_write_service'
  ) THEN
    CREATE POLICY "admin_audit_log_write_service" ON admin_audit_log
      FOR ALL USING (true);
  END IF;
END $$;



