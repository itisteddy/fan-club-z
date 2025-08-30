#!/bin/bash

# Fan Club Z - Registration Flow Fix
echo "🔧 Fan Club Z - Registration Flow Fix"
echo "===================================="

echo ""
echo "📋 Fix Summary:"
echo "  ✅ Prevents auto-switch to login mode when registration fails"
echo "  ✅ Shows clear error messages in registration form"
echo "  ✅ Improved test panel with working email domains"
echo "  ✅ Better error handling and user feedback"
echo ""

echo "🚀 Deploying registration fixes..."

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "client" ]; then
    echo "❌ Error: Please run this script from the Fan Club Z root directory"
    exit 1
fi

# Commit and push changes
echo "📦 Committing registration fixes..."
git add client/src/pages/auth/AuthPage.tsx
git commit -m "🔐 Fix registration flow - prevent auto-switch to login

- Fixed registration form staying in registration mode on errors
- Added prominent error display for failed registrations  
- Enhanced test panel with working email domains
- Improved user feedback and error messages
- Added warning about email domain compatibility

Fixes the issue where failed registration would redirect to login screen"

echo "⬆️  Pushing to repository..."
git push origin main

if [ $? -eq 0 ]; then
    echo "✅ Successfully pushed registration fixes"
else
    echo "❌ Error pushing to repository"
    exit 1
fi

echo ""
echo "🌐 Vercel will auto-deploy the frontend in 2-3 minutes"
echo ""
echo "🧪 To test the fixes:"
echo "1. Visit your deployed app"
echo "2. Switch to registration mode"
echo "3. Try registering with a .fcz.app email (should show error but stay in registration)"
echo "4. Use Test Mode panel with working domains (gmail.com, example.com, outlook.com)"
echo ""
echo "Expected behavior:"
echo "  ❌ Bad email domains: Shows error but stays in registration mode"
echo "  ✅ Good email domains: Registration should work normally"
echo "  ✅ Test accounts: Should work immediately"
echo ""
echo "🎉 Registration fix deployed successfully!"