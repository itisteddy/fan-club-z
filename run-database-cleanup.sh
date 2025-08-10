#!/bin/bash

# Database Cleanup Script for Fan Club Z
# This script clears all user data to allow fresh registration

echo "🧹 Fan Club Z Database Cleanup"
echo "================================"
echo ""
echo "⚠️  WARNING: This will delete ALL user data including:"
echo "   • User accounts"
echo "   • Predictions and bets"
echo "   • Wallets and transactions"
echo "   • Clubs and memberships"
echo "   • All related data"
echo ""
echo "This action cannot be undone!"
echo ""

# Check if user wants to proceed
read -p "Are you sure you want to continue? (yes/no): " confirm

if [[ $confirm != "yes" ]]; then
    echo "❌ Database cleanup cancelled."
    exit 0
fi

echo ""
echo "🔧 Running database cleanup..."

# Check if we're in the right directory
if [ ! -f "clear-database-users.sql" ]; then
    echo "❌ Error: clear-database-users.sql not found in current directory"
    echo "Please run this script from the project root directory"
    exit 1
fi

# Check if Supabase CLI is available
if ! command -v supabase &> /dev/null; then
    echo "❌ Error: Supabase CLI not found"
    echo "Please install Supabase CLI first:"
    echo "npm install -g supabase"
    exit 1
fi

echo "📊 Executing SQL cleanup script..."

# Run the SQL script
supabase db reset --linked

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Database cleanup completed successfully!"
    echo ""
    echo "🎉 All user data has been removed."
    echo "📧 Previously registered emails can now register again."
    echo ""
    echo "Next steps:"
    echo "1. Deploy the updated app with improved error messages"
    echo "2. Test registration with previously used emails"
    echo "3. Verify that error messages are clear and helpful"
    echo ""
else
    echo ""
    echo "❌ Database cleanup failed!"
    echo "Please check your Supabase connection and try again."
    exit 1
fi
