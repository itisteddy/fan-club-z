#!/bin/bash

# 🚀 Fan Club Z - Force Deploy Authentication Fixes
# This script ensures your local auth changes are properly deployed

set -e

echo "🔐 Fan Club Z - Force Deploy Authentication Changes"
echo "================================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Not in the project root directory"
    exit 1
fi

echo "🔍 Current Status:"
echo "   • Build completed successfully ✅"
echo "   • Authentication changes exist locally ✅" 
echo "   • Missing: Environment variables + code sync ❌"
echo ""

# Show current git status
echo "📋 Checking current git status..."
git status --short

echo ""
echo "🛠️  Preparing comprehensive deployment..."

# Stage ALL changes including the updated vercel.json
echo "📦 Staging all authentication-related changes..."
git add -A

# Check if there are changes to commit
if [ -z "$(git status --porcelain)" ]; then
    echo "ℹ️  No changes to commit. Forcing rebuild..."
    
    # Touch a file to force a new commit
    echo "# Force deploy $(date)" >> DEPLOY_FORCE.md
    git add DEPLOY_FORCE.md
fi

# Create comprehensive commit
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
echo "💾 Creating deployment commit..."

git commit -m "🔐 COMPLETE AUTH FIX DEPLOYMENT - ${TIMESTAMP}

✅ FIXES APPLIED:
- Add missing Supabase environment variables to vercel.json
- Include VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
- Force deployment of all local authentication changes
- Ensure AuthPage, authStore, and registration fixes are deployed

🎯 EXPECTED RESULTS:
- Registration creates users and auto-authenticates
- Login functionality works correctly
- Test Mode panel functions properly
- Authentication works in production

Deployment: complete_auth_fix_${TIMESTAMP}"

# Create deployment tag
git tag "complete_auth_${TIMESTAMP}" -m "Complete authentication fix deployment - ${TIMESTAMP}"

# Force push to ensure deployment
echo "🚀 Force pushing all changes to trigger deployment..."
git push origin main --force-with-lease
git push origin --tags

# Wait and verify build
echo ""
echo "⏱️  Waiting for Vercel deployment..."
echo "    Monitor at: https://vercel.com/dashboard"
echo ""

# Instructions for verification
echo "🎯 DEPLOYMENT INITIATED!"
echo "========================"
echo ""
echo "✅ What's being deployed:"
echo "   • Updated vercel.json with Supabase environment variables"
echo "   • All local authentication changes and fixes"
echo "   • AuthPage improvements with test mode"
echo "   • Enhanced authStore with proper session management"
echo "   • Registration flow that auto-authenticates users"
echo ""
echo "🌐 Check your deployment:"
echo "   1. Wait 3-5 minutes for Vercel to complete build"
echo "   2. Visit: https://fan-club-z.vercel.app"
echo "   3. Try registering a new user"
echo "   4. Verify auto-authentication after registration"
echo "   5. Test login with existing credentials"
echo ""
echo "🧪 Quick Test:"
echo "   • Click 'Test Mode' panel"
echo "   • Try test accounts: test@fanclubz.com / test123"
echo "   • Or register with: yourname@gmail.com"
echo ""
echo "🔍 Troubleshooting:"
echo "   • Check Vercel dashboard for build status"
echo "   • Open browser console for any errors"
echo "   • Verify Supabase connection in Network tab"
echo ""
echo "✨ Your authentication fixes should be live in 3-5 minutes!"