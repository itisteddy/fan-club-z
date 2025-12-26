-- Extend admin_audit_log with target_type and reason columns for better filtering

ALTER TABLE admin_audit_log 
  ADD COLUMN IF NOT EXISTS target_type TEXT NULL,
  ADD COLUMN IF NOT EXISTS reason TEXT NULL;

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_action ON admin_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_target_type ON admin_audit_log(target_type);

