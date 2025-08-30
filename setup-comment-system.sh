#!/bin/bash

echo "🔧 Setting up Twitter-style Comment System for Fan Club Z..."
echo "=================================================="

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '#' | awk '/=/ {print $1}')
fi

# Check if required environment variables are set
if [ -z "$VITE_SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo "❌ Missing required environment variables:"
    echo "   VITE_SUPABASE_URL: ${VITE_SUPABASE_URL:+✅ Set}${VITE_SUPABASE_URL:-❌ Missing}"
    echo "   SUPABASE_SERVICE_ROLE_KEY: ${SUPABASE_SERVICE_ROLE_KEY:+✅ Set}${SUPABASE_SERVICE_ROLE_KEY:-❌ Missing}"
    echo ""
    echo "Please check your .env file and try again."
    exit 1
fi

echo "✅ Environment variables found"
echo "🌐 Supabase URL: $VITE_SUPABASE_URL"
echo ""

# Extract database connection info from Supabase URL
DB_HOST=$(echo $VITE_SUPABASE_URL | sed 's|https://||' | sed 's|\.supabase\.co.*|.supabase.co|')
DB_NAME="postgres"
DB_USER="postgres"

# Prompt for database password if not set
if [ -z "$SUPABASE_DB_PASSWORD" ]; then
    echo "🔑 Please enter your Supabase database password:"
    read -s SUPABASE_DB_PASSWORD
    echo ""
fi

echo "📊 Applying comment system database schema..."

# Use psql to run the schema if available
if command -v psql &> /dev/null; then
    echo "   Using psql to apply schema..."
    PGPASSWORD="$SUPABASE_DB_PASSWORD" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -f comment-system-schema.sql
    
    if [ $? -eq 0 ]; then
        echo "✅ Database schema applied successfully!"
    else
        echo "❌ Failed to apply schema with psql"
        echo "   Falling back to manual instructions..."
        echo ""
        echo "📋 Manual Setup Instructions:"
        echo "1. Open your Supabase project dashboard"
        echo "2. Go to SQL Editor"
        echo "3. Copy the contents of 'comment-system-schema.sql'"
        echo "4. Paste and execute the SQL"
        echo ""
        echo "🔗 Supabase Dashboard: https://app.supabase.com/project/${VITE_SUPABASE_URL##*/}"
    fi
else
    echo "   psql not found, providing manual instructions..."
    echo ""
    echo "📋 Manual Setup Instructions:"
    echo "1. Open your Supabase project dashboard"
    echo "2. Go to SQL Editor"
    echo "3. Copy the contents of 'comment-system-schema.sql'"
    echo "4. Paste and execute the SQL"
    echo ""
    echo "🔗 Supabase Dashboard: https://app.supabase.com/project/$(echo $VITE_SUPABASE_URL | rev | cut -d'/' -f1 | rev)"
fi

echo ""
echo "🧪 Testing comment system setup..."
node check-comment-system.js

echo ""
echo "🎉 Comment system setup complete!"
echo ""
echo "📱 How to use the comment system:"
echo "1. Navigate to any prediction detail page"
echo "2. Click the 'comments' button to expand"
echo "3. Post, reply, like, edit, and delete comments"
echo "4. Comments are persistent and Twitter-style threaded"
echo ""
echo "💡 The comment system works alongside your existing WebSocket chat:"
echo "   - Chat: Real-time ephemeral discussions"
echo "   - Comments: Persistent Twitter-style commentary"
