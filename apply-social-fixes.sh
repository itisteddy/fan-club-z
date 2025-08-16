#!/bin/bash

# Make the script executable
chmod +x "$0"

# Apply social features database fix
echo "🔄 Applying social features database fix..."

# Check if we're in the right directory
if [ ! -f "fix-likes-and-social-features.sql" ]; then
    echo "❌ SQL file not found. Make sure you're in the project root directory."
    exit 1
fi

# Apply the SQL migration
echo "📊 Applying database migration..."

# Use Supabase CLI if available
if command -v supabase &> /dev/null; then
    echo "Using Supabase CLI..."
    supabase db reset --linked
    supabase db push
    # Apply the fix
    echo "Applying social features fix..."
    cat fix-likes-and-social-features.sql | supabase db sql
else
    echo "⚠️  Supabase CLI not found. Please run the SQL manually in your Supabase dashboard:"
    echo "   1. Go to your Supabase project"
    echo "   2. Navigate to SQL Editor"
    echo "   3. Copy and paste the contents of fix-likes-and-social-features.sql"
    echo "   4. Run the query"
    echo ""
    echo "The SQL file contains all necessary fixes for:"
    echo "   - Adding likes_count and comments_count columns to predictions"
    echo "   - Creating prediction_likes table"
    echo "   - Setting up triggers for automatic count updates"
    echo "   - Creating utility functions for like management"
fi

echo "✅ Database fix script completed!"
echo ""
echo "📋 Manual verification steps:"
echo "   1. Check that prediction_likes table exists"
echo "   2. Verify predictions table has likes_count and comments_count columns"
echo "   3. Test that like functionality works in the app"
echo "   4. Verify comment counts are properly tracked"
