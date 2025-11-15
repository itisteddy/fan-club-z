#!/bin/bash

# Run crypto migrations using Supabase SQL Editor API or psql
# This script attempts multiple methods to execute the migrations

set -e

cd "$(dirname "$0")"

echo "🚀 Running Crypto Migrations (109, 110)"
echo "======================================"
echo ""

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | grep -v '^$' | xargs)
fi

SUPABASE_URL="${SUPABASE_URL:-${VITE_SUPABASE_URL}}"
SUPABASE_KEY="${SUPABASE_SERVICE_ROLE_KEY}"

if [ -z "$SUPABASE_URL" ]; then
    echo "❌ Error: SUPABASE_URL or VITE_SUPABASE_URL not set"
    exit 1
fi

if [ -z "$SUPABASE_KEY" ]; then
    echo "❌ Error: SUPABASE_SERVICE_ROLE_KEY not set"
    exit 1
fi

echo "📋 Supabase URL: ${SUPABASE_URL:0:30}..."
echo ""

# Extract project reference from URL
PROJECT_REF=$(echo "$SUPABASE_URL" | sed -E 's|https://([^.]+)\.supabase\.co.*|\1|')

echo "📝 Migration 109: Add escrow_lock_id to prediction_entries"
echo "------------------------------------------------------------"

# Read migration file
MIGRATION_109=$(cat migrations/109_prediction_entries_crypto.sql)

echo "SQL Preview (first 200 chars):"
echo "$MIGRATION_109" | head -10
echo ""

# Try to execute via Supabase Management API or SQL Editor
echo "💡 To run migrations, choose one method:"
echo ""
echo "Method 1: Supabase Dashboard (Recommended)"
echo "  1. Go to: https://supabase.com/dashboard/project/${PROJECT_REF}/sql"
echo "  2. Copy and paste the contents of: migrations/109_prediction_entries_crypto.sql"
echo "  3. Click 'Run'"
echo "  4. Repeat for: migrations/110_cleanup_demo_data.sql"
echo ""

echo "Method 2: psql (if you have connection string)"
echo "  psql \"\$DATABASE_URL\" -f migrations/109_prediction_entries_crypto.sql"
echo "  psql \"\$DATABASE_URL\" -f migrations/110_cleanup_demo_data.sql"
echo ""

echo "Method 3: Supabase CLI"
echo "  supabase db push --db-url \"\$DATABASE_URL\""
echo ""

# Create a combined SQL file for easy copy-paste
COMBINED_FILE="migrations/COMBINED_109_110.sql"
cat > "$COMBINED_FILE" << EOF
-- Combined Migration: 109 + 110
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/${PROJECT_REF}/sql

-- ========================================
-- Migration 109: Crypto Escrow Support
-- ========================================

$(cat migrations/109_prediction_entries_crypto.sql)

-- ========================================
-- Migration 110: Cleanup Demo Data
-- ========================================

$(cat migrations/110_cleanup_demo_data.sql)
EOF

echo "✅ Created combined migration file: $COMBINED_FILE"
echo "   Copy its contents and paste into Supabase SQL Editor"
echo ""

# Try to use Supabase Management API if available
if command -v curl > /dev/null; then
    echo "🔄 Attempting to execute via Supabase Management API..."
    
    # Note: Supabase Management API requires different auth
    # For now, we'll just show instructions
    echo "   (Management API requires project API key, showing instructions instead)"
    echo ""
fi

echo "📄 Migration files ready:"
echo "  - migrations/109_prediction_entries_crypto.sql"
echo "  - migrations/110_cleanup_demo_data.sql"
echo "  - migrations/COMBINED_109_110.sql (both in one file)"
echo ""
echo "✅ Next step: Run SQL in Supabase Dashboard or via psql"

