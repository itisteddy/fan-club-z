#!/bin/bash

# Fan Club Z - Prediction Creation Fix Deployment
# This script fixes prediction creation issues and removes debug elements

echo "🚀 Starting Fan Club Z prediction fixes deployment..."

# Set error handling
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️ $1${NC}"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "Must be run from project root directory"
    exit 1
fi

print_info "Current directory: $(pwd)"

# 1. Git status check
print_info "Checking git status..."
if [ -n "$(git status --porcelain)" ]; then
    print_warning "Working directory has uncommitted changes"
    git status --short
    echo ""
fi

# 2. Stage the fixed files
print_info "Staging fixed files..."

# Add the fixed files
git add client/src/pages/BetsTab.tsx
git add client/src/store/predictionStore.ts
git add client/src/stores/predictionStore.ts
git add supabase-schema-fixed.sql

print_status "Files staged successfully"

# 3. Commit the changes
print_info "Committing prediction fixes..."

COMMIT_MESSAGE="🔧 Fix prediction creation & remove debug elements

- Fixed database schema trigger existence checks
- Updated prediction store with correct field mapping
- Removed debug info element from My Predictions page
- Fixed createPrediction data formatting issues
- Added error handling for database operations

Fixes:
- Database trigger 'already exists' error
- Prediction creation failing due to field name mismatch
- Debug info showing on production My Predictions page"

git commit -m "$COMMIT_MESSAGE"
print_status "Changes committed successfully"

# 4. Push to trigger deployments
print_info "Pushing to trigger automatic deployments..."

# Push to main branch
git push origin main

print_status "Code pushed to main branch"

# 5. Wait a moment for deployment triggers
print_info "Waiting for deployment systems to trigger..."
sleep 3

# 6. Check deployment status
print_info "Checking deployment status..."

echo ""
echo "🔄 Deployment Status:"
echo "=================="
echo "Frontend (Vercel): https://vercel.com/dashboard"
echo "Backend (Render):  https://dashboard.render.com"
echo ""
echo "📋 Database Update Required:"
echo "==========================="
echo "Run the following SQL in your Supabase SQL Editor:"
echo "File: supabase-schema-fixed.sql"
echo ""
echo "🧪 Testing Instructions:"
echo "======================="
echo "1. Wait 2-3 minutes for deployments to complete"
echo "2. Test prediction creation on the deployed app"
echo "3. Verify no debug info shows on My Predictions page"
echo "4. Check browser console for any remaining errors"
echo ""

# 7. Display URLs for quick access
echo "🌐 Quick Access URLs:"
echo "==================="
echo "Production App: https://fan-club-z.vercel.app"
echo "Supabase DB:    https://supabase.com/dashboard/project/jhtnsyhknvltgrksfiunysql"
echo ""

print_status "Prediction creation fixes deployment completed!"
print_info "Don't forget to run the SQL schema update in Supabase!"

echo ""
echo "📝 Summary of Changes:"
echo "===================="
echo "✅ Removed debug info from My Predictions page"
echo "✅ Fixed prediction creation field mapping"
echo "✅ Updated database schema with trigger safety checks"
echo "✅ Improved error handling in prediction store"
echo "✅ Added proper validation for prediction data"
echo ""
echo "🔍 Next Steps:"
echo "============="
echo "1. Run supabase-schema-fixed.sql in Supabase SQL Editor"
echo "2. Test prediction creation flow end-to-end"
echo "3. Monitor for any remaining issues"
echo "4. Update conversation log with results"
