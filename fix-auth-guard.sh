#!/bin/bash

set -e

echo "🔧 Fixing auth guard issue - switching from BetsTab to PredictionsTab"

# Navigate to project directory
cd "$(dirname "$0")"

echo "📦 Installing dependencies..."
npm install

echo "🧹 Clearing cache..."
# Clear any potential cache issues
rm -rf client/dist 2>/dev/null || true
rm -rf client/.vite 2>/dev/null || true
rm -rf client/node_modules/.cache 2>/dev/null || true

echo "🔨 Building client..."
cd client
npm run build

echo "✅ Build complete!"

echo "🚀 The following changes have been applied:"
echo "  1. ✅ App.tsx now imports and uses PredictionsTab instead of BetsTab"
echo "  2. ✅ PredictionsTab now has proper auth guard with session + store sync"
echo "  3. ✅ Added proper loading states and debug logging"
echo "  4. ✅ Added fallback authentication logic"
echo ""
echo "🔍 Debug info will now show in browser console when you visit /predictions"
echo "📱 The auth guard should now properly respect the logged-in user state"
echo ""
echo "🔄 Please test the following:"
echo "  1. Navigate to /predictions while logged in"
echo "  2. Check browser console for auth state debug logs" 
echo "  3. Verify that your predictions are shown instead of the sign-in gate"
echo ""
echo "🐛 If issues persist, check the browser console for the debug output from PredictionsTab"
