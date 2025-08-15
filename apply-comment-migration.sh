#!/bin/bash

echo "🚀 Applying Complete Comment System Database Migration"
echo "======================================================"

echo ""
echo "📋 Instructions to apply the database migration:"
echo ""
echo "1. Go to your Supabase Dashboard:"
echo "   https://supabase.com/dashboard"
echo ""
echo "2. Select your Fan Club Z project"
echo ""
echo "3. Go to SQL Editor (left sidebar)"
echo ""
echo "4. Copy and paste the contents of 'supabase-comment-system-complete-fix.sql'"
echo ""
echo "5. Click 'Run' to execute the migration"
echo ""
echo "6. Wait for the migration to complete (this will take a few minutes)"
echo ""
echo "✅ After migration, the comment system will work properly!"
echo ""

echo "🔍 What this migration fixes:"
echo "   - Creates proper relationships between comments and comment_likes"
echo "   - Adds nested replies functionality"
echo "   - Implements emoji reactions system"
echo "   - Adds comment moderation features"
echo "   - Sets up Row Level Security policies"
echo ""

echo "📄 Migration file location:"
echo "   $(pwd)/supabase-comment-system-complete-fix.sql"
echo ""

echo "🎯 This will resolve the database relationship error you're seeing!"
echo ""

echo "Opening migration file..."
open supabase-comment-system-complete-fix.sql

echo ""
echo "⏰ After applying the migration, test at:"
echo "   https://dev.fanclubz.app"
echo ""
echo "🎉 The comment system should work perfectly!"
