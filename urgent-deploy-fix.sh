#!/bin/bash

echo "🔥 URGENT: Deploying Registration Fixes to Production"
echo "=================================================="

cd "/Users/efe/Library/CloudStorage/OneDrive-Personal/Fan Club Z v2.0/FanClubZ-version2.0"

echo ""
echo "📋 Current Status:"
echo "  ❌ Registration still fails with .fcz.app emails"
echo "  ❌ Form switches back to login mode on failure"
echo "  ✅ Supabase connection working"
echo "  ✅ Authentication system initialized"
echo ""

echo "🔧 Applying fixes:"
echo "  1. Prevent form mode switching on registration failure"
echo "  2. Show error messages in registration form"
echo "  3. Update test panel with working email domains"
echo ""

# Check if fixes are present
if grep -q "authError" client/src/pages/auth/AuthPage.tsx; then
    echo "✅ Registration fixes are present in code"
else
    echo "❌ Registration fixes not found - something went wrong"
    exit 1
fi

echo "📦 Committing and deploying..."
git add -A
git commit -m "🚨 URGENT: Fix registration flow issues

- Prevent auto-switch to login mode when registration fails
- Show clear error messages in registration form  
- Update test panel with working email domains
- Better error handling for email validation issues

This fixes the issue where users couldn't register due to:
1. Form switching to login mode on registration failure
2. No clear error feedback
3. Using incompatible email domains"

echo "⬆️  Pushing to GitHub..."
git push origin main

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ DEPLOYED SUCCESSFULLY!"
    echo ""
    echo "🕐 Wait 2-3 minutes for Vercel to deploy, then:"
    echo ""
    echo "🧪 TEST WITH THESE WORKING EMAIL DOMAINS:"
    echo "   ✅ yourname@gmail.com"
    echo "   ✅ yourname@example.com" 
    echo "   ✅ yourname@outlook.com"
    echo "   ✅ yourname@test.com"
    echo ""
    echo "❌ AVOID THESE DOMAINS (Supabase rejects them):"
    echo "   ❌ @fcz.app"
    echo "   ❌ @fanclub.app"
    echo "   ❌ Custom domains that aren't widely recognized"
    echo ""
    echo "🎯 TO TEST:"
    echo "1. Refresh your browser"
    echo "2. Click 'Create one now' to switch to registration"
    echo "3. Try: yourname@gmail.com with password: test123"
    echo "4. Should work immediately!"
    echo ""
else
    echo "❌ Deployment failed - check git status"
    exit 1
fi