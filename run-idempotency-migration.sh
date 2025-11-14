#!/bin/bash

# Script to run idempotency migration safely
# This script will apply the idempotency support migration to your database

echo "======================================"
echo "FanClubZ - Idempotency Migration"
echo "======================================"

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ ERROR: DATABASE_URL environment variable is not set"
    echo ""
    echo "Please set it using:"
    echo "export DATABASE_URL='your-supabase-connection-string'"
    echo ""
    echo "You can find this in:"
    echo "1. Supabase Dashboard > Settings > Database"
    echo "2. Or in your .env file"
    exit 1
fi

# Extract database info for display (hide password)
DB_INFO=$(echo $DATABASE_URL | sed 's/:\/\/[^:]*:[^@]*@/:\/\/***:***@/')
echo "📊 Target Database: $DB_INFO"
echo ""

# Confirm before running
echo "This migration will:"
echo "✅ Create idempotency_keys table"
echo "✅ Add idempotency columns to wallet_transactions"
echo "✅ Add settlement tracking to predictions"
echo "✅ Create realtime_subscriptions table"
echo "✅ Add helper functions and indexes"
echo ""
read -p "Do you want to continue? (y/N) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Migration cancelled."
    exit 0
fi

echo ""
echo "🚀 Running migration..."
echo ""

# Run the migration
psql "$DATABASE_URL" < migrations/002_add_idempotency_support_fixed.sql

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Migration completed successfully!"
    echo ""
    echo "Next steps:"
    echo "1. Restart your server to load the new middleware"
    echo "2. Test bet placement with the new idempotency system"
    echo "3. Monitor for any duplicate request attempts"
else
    echo ""
    echo "❌ Migration failed. Please check the error messages above."
    echo ""
    echo "If you see 'column already exists' errors, the migration may have partially completed."
    echo "You can safely re-run this script - it uses IF NOT EXISTS clauses."
    exit 1
fi
