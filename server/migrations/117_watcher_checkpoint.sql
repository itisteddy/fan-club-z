-- Migration 117: Add checkpoint support for blockchain watchers
-- Enables persistent checkpoint storage for deposit watcher to survive restarts

-- Ensure event_log table has unique constraint on (source, kind, ref) for checkpoint deduplication
DO $$
BEGIN
  -- Add unique constraint if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'event_log_source_kind_ref_unique'
  ) THEN
    CREATE UNIQUE INDEX event_log_source_kind_ref_unique
    ON event_log (source, kind, ref)
    WHERE source IN ('base-watcher-checkpoint', 'base-watcher-dlq');
  END IF;
END $$;

-- Add index for efficient checkpoint queries
CREATE INDEX IF NOT EXISTS idx_event_log_checkpoint
ON event_log (source, kind, ts DESC)
WHERE source = 'base-watcher-checkpoint';

-- Add index for dead-letter queue queries
CREATE INDEX IF NOT EXISTS idx_event_log_dlq
ON event_log (source, kind, ts DESC)
WHERE source = 'base-watcher-dlq';

COMMENT ON INDEX event_log_source_kind_ref_unique IS 'Ensures checkpoint and DLQ entries are unique per (source, kind, ref)';
COMMENT ON INDEX idx_event_log_checkpoint IS 'Fast checkpoint lookups for watcher resume';
COMMENT ON INDEX idx_event_log_dlq IS 'Fast dead-letter queue queries for failed deposit processing';

