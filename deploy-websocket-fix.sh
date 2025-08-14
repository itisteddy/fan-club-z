#!/bin/bash
chmod +x "$0"

# Deploy WebSocket Connection Fix to Development
# This script fixes WebSocket connection issues on Render

echo "🚀 Deploying WebSocket Connection Fix to Development Branch"
echo "==========================================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Not in project root directory"
    exit 1
fi

# Check current branch
current_branch=$(git branch --show-current)
echo "📋 Current branch: $current_branch"

# Ensure we're working on development branch
if [ "$current_branch" != "development" ]; then
    echo "🔄 Switching to development branch..."
    git checkout development
    if [ $? -ne 0 ]; then
        echo "❌ Failed to switch to development branch"
        exit 1
    fi
fi

# Pull latest changes
echo "⬇️ Pulling latest changes..."
git pull origin development

# Stage the changes
echo "📦 Staging WebSocket fixes..."
git add client/src/store/chatStore.ts
git add server/src/app.ts
git add server/src/services/ChatService.ts

# Check what we're committing
echo "📋 Changes to be committed:"
git diff --staged --name-only

# Commit the changes
echo "💾 Committing WebSocket connection fixes..."
git commit -m "🔧 Fix WebSocket connection issues for Render deployment

- Updated client-side server URL detection for better environment handling
- Enhanced CORS configuration to include current Vercel deployment URLs
- Improved Socket.IO connection timeout and retry settings for Render
- Added better logging for connection debugging
- Updated allowed origins in both Express CORS and Socket.IO configuration

Fixes:
- WebSocket connection errors on Vercel -> Render deployments
- CORS blocking issues for current deployment URLs
- Connection timeout issues on Render free tier

Changes:
- client/src/store/chatStore.ts: Better URL detection and connection settings
- server/src/app.ts: Enhanced CORS configuration
- server/src/services/ChatService.ts: Updated Socket.IO CORS settings"

if [ $? -ne 0 ]; then
    echo "❌ Failed to commit changes"
    exit 1
fi

# Push to development branch
echo "🚀 Pushing to development branch..."
git push origin development

if [ $? -ne 0 ]; then
    echo "❌ Failed to push to development branch"
    exit 1
fi

echo "✅ WebSocket fixes successfully deployed to development branch!"
echo ""
echo "🔗 The changes will trigger a new deployment on Render"
echo "📱 Monitor the deployment at: https://dashboard.render.com"
echo ""
echo "🧪 Once deployed, test the WebSocket connection by:"
echo "   1. Opening the app at: https://fan-club-z-lu5ywnjr0-teddys-projects-d67ab22a.vercel.app"
echo "   2. Creating or viewing a prediction"
echo "   3. Checking browser console for WebSocket connection logs"
echo ""
echo "🔍 Key improvements:"
echo "   • Better URL detection for Vercel deployments"
echo "   • Enhanced CORS configuration for current deployment URLs"
echo "   • Increased connection timeout and retry attempts"
echo "   • Improved error handling and logging"
