#!/bin/bash

echo "🚀 Running all Phase 1 migrations..."
echo ""

# Check if SUPABASE_DB_URL is set
if [ -z "$SUPABASE_DB_URL" ]; then
    echo "❌ SUPABASE_DB_URL not set in environment"
    echo "Please add it to server/.env and run:"
    echo "  source server/.env && ./run-all-migrations.sh"
    exit 1
fi

# Function to run SQL file
run_sql() {
    local file=$1
    echo "📝 Running: $file"
    
    if [ ! -f "$file" ]; then
        echo "⏭️  File not found, skipping"
        return 0
    fi
    
    # Use psql to run the SQL file
    psql "$SUPABASE_DB_URL" -f "$file" -v ON_ERROR_STOP=1
    
    if [ $? -eq 0 ]; then
        echo "✅ Success: $file"
        echo ""
        return 0
    else
        echo "❌ Failed: $file"
        return 1
    fi
}

# Run migrations in order
run_sql "server/migrations/114_add_lock_expiration.sql" || exit 1
run_sql "server/migrations/115_lock_idempotency.sql" || exit 1
run_sql "cleanup-locks.sql" || exit 1

echo "✅ All migrations completed successfully!"
echo ""
echo "Next steps:"
echo "1. Restart server: cd server && npm run dev"
echo "2. Check logs for: ✅ Lock expiration cron job started"
echo "3. Test by placing a bet"

