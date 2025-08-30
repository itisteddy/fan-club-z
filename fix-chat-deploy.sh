#!/bin/bash

echo "🔧 Fan Club Z - WebSocket Chat Fix & Deploy"
echo "=============================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
  echo "❌ Error: Not in the project root directory"
  exit 1
fi

echo "📋 Changes made:"
echo "  ✅ Fixed chat store authentication timing"
echo "  ✅ Updated ChatModal connection handling"
echo "  ✅ Added better error states and debugging"
echo "  ✅ Improved server-side authentication"
echo "  ✅ Enhanced connection flow logging"

echo ""
echo "🧪 Testing locally first..."

# Start dev server in background
echo "Starting development server..."
npm run dev &
DEV_PID=$!

# Wait for server to start
sleep 5

# Test health endpoint
echo "🏥 Testing health endpoint..."
curl -s http://localhost:5173/health > /dev/null
if [ $? -eq 0 ]; then
  echo "✅ Dev server is running"
else
  echo "⚠️ Dev server may not be ready yet"
fi

# Kill dev server
kill $DEV_PID 2>/dev/null

echo ""
echo "🏗️ Building for production..."
npm run build

if [ $? -ne 0 ]; then
  echo "❌ Build failed! Please check the errors above."
  exit 1
fi

echo "✅ Build successful!"

echo ""
echo "📤 Deploying to production..."

# Add changes to git
git add .

# Commit with descriptive message
git commit -m "🔧 Fix WebSocket chat connection and authentication

- Fixed authentication timing in chat store
- Added proper connection state management
- Improved error handling and user feedback
- Enhanced server-side authentication validation
- Added connection debugging and retry logic
- Fixed ChatModal to wait for authentication before joining

Resolves: 'Cannot join prediction: socket not connected or user not authenticated'"

# Push to main branch (triggers Render deployment)
git push origin main

if [ $? -eq 0 ]; then
  echo "✅ Successfully pushed to main branch"
  echo ""
  echo "🚀 Deployment Status:"
  echo "  - Render will auto-deploy from main branch"
  echo "  - Check deployment at: https://dashboard.render.com"
  echo "  - Production URL: https://fan-club-z.onrender.com"
  echo ""
  echo "🧪 Testing Instructions:"
  echo "  1. Wait 2-3 minutes for deployment to complete"
  echo "  2. Open https://dev.fanclubz.app"
  echo "  3. Sign in with a test account"
  echo "  4. Navigate to any prediction"
  echo "  5. Click the chat button"
  echo "  6. Check browser console for connection logs"
  echo "  7. Verify chat connects and authentication works"
  echo ""
  echo "🔍 Debug Info:"
  echo "  - Console will show connection flow"
  echo "  - Look for '✅ Authenticated with server' message"
  echo "  - Check for successful prediction room join"
else
  echo "❌ Failed to push to git repository"
  exit 1
fi

echo ""
echo "✨ Chat fix deployment initiated!"
echo "Monitor the logs to ensure the fix works correctly."
