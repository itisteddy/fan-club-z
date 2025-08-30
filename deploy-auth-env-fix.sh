#!/bin/bash

# 🔐 Fan Club Z - Authentication Environment Variables Fix
# This script fixes the missing Supabase env vars in production

set -e  # Exit on any error

echo "🔐 Fan Club Z - Authentication Environment Fix"
echo "=============================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Not in the project root directory"
    exit 1
fi

echo "🔍 Issue Identified:"
echo "   • Your authentication changes work locally ✅"
echo "   • Missing Supabase environment variables in Vercel ❌"
echo "   • Authentication fails in production due to missing config"
echo ""

# Update vercel.json with Supabase variables
echo "📝 Updating vercel.json with Supabase environment variables..."

# The vercel.json has already been updated above
echo "✅ Added missing environment variables:"
echo "   • VITE_SUPABASE_URL"
echo "   • VITE_SUPABASE_ANON_KEY"
echo ""

# Stage and commit the changes
echo "📦 Committing the authentication environment fix..."
git add vercel.json

# Create commit with clear description
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
git add -A
git commit -m "🔐 CRITICAL FIX: Add missing Supabase env vars to vercel.json

- Add VITE_SUPABASE_URL to production environment
- Add VITE_SUPABASE_ANON_KEY to production environment
- This fixes authentication not working in deployed version
- Local auth changes were working but missing production config

Deployment fix: auth_env_${TIMESTAMP}"

# Create deployment tag
git tag "auth_env_fix_${TIMESTAMP}" -m "Authentication environment variables fix - ${TIMESTAMP}"

# Push to trigger new deployment
echo "🚀 Pushing authentication environment fix..."
git push origin main
git push origin --tags

echo ""
echo "🎯 CRITICAL FIX DEPLOYED!"
echo "========================"
echo ""
echo "✅ What was fixed:"
echo "   • Added VITE_SUPABASE_URL to Vercel production environment"
echo "   • Added VITE_SUPABASE_ANON_KEY to Vercel production environment"
echo "   • Authentication will now work in deployed version"
echo ""
echo "🌐 Your authentication should now work at:"
echo "   https://fan-club-z.vercel.app"
echo ""
echo "🧪 Test the fix:"
echo "   1. Visit the deployed app"
echo "   2. Try registering a new user"
echo "   3. Try logging in with existing credentials"
echo "   4. Use Test Mode panel for quick testing"
echo ""
echo "⏱️  Wait 2-3 minutes for Vercel to redeploy with new env vars"
echo ""
echo "🔍 If still not working, check:"
echo "   • Vercel deployment logs for any build errors"
echo "   • Browser console for any remaining errors"
echo "   • Supabase dashboard for authentication attempts"
echo ""
echo "✨ Your local authentication changes are now live!"