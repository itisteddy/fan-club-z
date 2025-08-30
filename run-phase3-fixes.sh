#!/bin/bash

# Phase 3 Fix: Add sample prediction data and fix static content issues
echo "🔧 Phase 3: Adding sample prediction data with USD currency..."

# Check if we're in the correct directory
if [ ! -f "package.json" ]; then
  echo "❌ Error: Run this script from the project root directory"
  exit 1
fi

# Source environment variables
if [ -f ".env" ]; then
  source .env
fi

# Check if SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  echo "⚠️  Warning: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not found in environment"
  echo "Please ensure your .env file contains the Supabase credentials"
  exit 1
fi

echo "📡 Running database migration to add sample predictions..."

# Run the SQL script using psql if available, otherwise use curl
if command -v psql >/dev/null 2>&1; then
  echo "Using psql to run migration..."
  psql "$DATABASE_URL" -f phase3-sample-predictions-usd.sql
else
  echo "Using Supabase REST API to run migration..."
  
  # Read the SQL file and execute it via Supabase
  curl -X POST "$SUPABASE_URL/rest/v1/rpc/exec_sql" \
    -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
    -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
    -H "Content-Type: application/json" \
    -d @phase3-sample-predictions-usd.sql
fi

echo "✅ Phase 3 migration complete!"
echo "📊 Added 6 sample predictions with realistic USD values and activity"
echo "🔄 Restart your development server to see the changes"

# Optional: Restart the development server
read -p "Would you like to restart the development server now? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  echo "🔄 Restarting development server..."
  npm run dev
fi