#!/bin/bash

# Load environment variables
source ../.env

SUPABASE_URL="${VITE_SUPABASE_URL}"
SERVICE_ROLE_KEY="${SUPABASE_SERVICE_ROLE_KEY}"

if [ -z "$SUPABASE_URL" ] || [ -z "$SERVICE_ROLE_KEY" ]; then
  echo "❌ Missing Supabase credentials"
  exit 1
fi

echo "🔄 Applying Migration 116 via Supabase REST API..."
echo ""

# Extract project ref from URL
PROJECT_REF=$(echo "$SUPABASE_URL" | sed -E 's|https://([^.]+)\.supabase\.co|\1|')
API_URL="https://${PROJECT_REF}.supabase.co/rest/v1/rpc"

echo "📡 Project: $PROJECT_REF"
echo "🔗 API URL: $API_URL"
echo ""

# Function to execute SQL via REST API
execute_sql() {
  local sql="$1"
  local description="$2"
  
  echo "▶ $description"
  
  # Use psql if available, otherwise show SQL
  if command -v psql &> /dev/null && [ -n "$SUPABASE_DB_URL" ]; then
    echo "$sql" | psql "$SUPABASE_DB_URL" -q
    if [ $? -eq 0 ]; then
      echo "  ✅ Success"
    else
      echo "  ❌ Failed"
    fi
  else
    echo "  ℹ️  SQL to run manually:"
    echo "$sql"
    echo ""
  fi
}

# Migration statements
execute_sql "ALTER TABLE public.escrow_locks DROP CONSTRAINT IF EXISTS escrow_locks_state_check;" "1. Drop old state CHECK constraint"

execute_sql "ALTER TABLE public.escrow_locks ADD CONSTRAINT escrow_locks_state_check CHECK (state IN ('locked', 'released', 'voided', 'consumed', 'expired'));" "2. Add new state CHECK constraint"

execute_sql "ALTER TABLE public.escrow_locks ADD COLUMN IF NOT EXISTS status text;" "3. Add status column"

execute_sql "ALTER TABLE public.escrow_locks DROP CONSTRAINT IF EXISTS escrow_locks_status_check;" "4. Drop old status CHECK constraint"

execute_sql "ALTER TABLE public.escrow_locks ADD CONSTRAINT escrow_locks_status_check CHECK (status IS NULL OR status IN ('locked', 'released', 'voided', 'consumed', 'expired'));" "5. Add new status CHECK constraint"

execute_sql "UPDATE public.escrow_locks SET status = state WHERE status IS NULL OR status != state;" "6. Sync status from state"

execute_sql "CREATE INDEX IF NOT EXISTS idx_escrow_locks_state ON public.escrow_locks(state) WHERE state IN ('locked', 'consumed');" "7. Add index on state"

execute_sql "CREATE INDEX IF NOT EXISTS idx_escrow_locks_user_state ON public.escrow_locks(user_id, state, created_at DESC);" "8. Add index on user_id + state"

execute_sql "ALTER TABLE public.escrow_locks ADD COLUMN IF NOT EXISTS lock_ref text;" "9. Add lock_ref column"

execute_sql "CREATE UNIQUE INDEX IF NOT EXISTS idx_escrow_locks_lock_ref ON public.escrow_locks(lock_ref) WHERE lock_ref IS NOT NULL;" "10. Add unique index on lock_ref"

execute_sql "ALTER TABLE public.escrow_locks ADD COLUMN IF NOT EXISTS option_id uuid;" "11. Add option_id column"

echo ""
echo "✅ Migration 116 SQL generated!"
echo ""
echo "📋 To apply manually:"
echo "1. Go to: https://supabase.com/dashboard/project/$PROJECT_REF/sql/new"
echo "2. Copy/paste the contents of: server/migrations/116_fix_escrow_locks_schema.sql"
echo "3. Click 'Run'"
echo ""

