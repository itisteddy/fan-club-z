#!/bin/bash

# Deploy to Development Environment
# This script deploys WebSocket fixes to the development branch for testing

echo "🚧 Deploying to Development Environment (dev.fanclubz.app)"
echo "============================================================"

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
echo "📦 Staging development configuration fixes..."
git add client/src/store/chatStore.ts
git add server/src/app.ts
git add server/src/services/ChatService.ts

# Check what we're committing
echo "📋 Changes to be committed:"
git diff --staged --name-only

# Commit the changes with development-specific message
echo "💾 Committing development WebSocket fixes..."
git commit -m "🧪 DEV: Configure WebSocket for dev.fanclubz.app testing

Development Environment Configuration:
- Frontend URL detection for dev.fanclubz.app
- Backend CORS configuration for development domain
- WebSocket connection optimized for development testing
- Enhanced logging for dev environment debugging

Server URL mapping:
- dev.fanclubz.app → https://fan-club-z.onrender.com (development server)
- Improved connection timeout handling for Render free tier
- CORS allows both dev.fanclubz.app and app.fanclubz.app for testing

Testing URLs:
- Dev frontend: https://dev.fanclubz.app
- Production frontend: https://app.fanclubz.app  
- Backend server: https://fan-club-z.onrender.com

Files modified:
- client/src/store/chatStore.ts: Environment-aware URL detection
- server/src/app.ts: Development domain CORS configuration
- server/src/services/ChatService.ts: Enhanced origin validation"

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

echo "✅ Development configuration successfully deployed!"
echo ""
echo "🔗 The changes will trigger a new deployment on Render"
echo "📱 Monitor the deployment at: https://dashboard.render.com"
echo ""
echo "🧪 Testing Instructions:"
echo "   1. Wait for Render deployment to complete (~2-3 minutes)"
echo "   2. Open development app: https://dev.fanclubz.app"
echo "   3. Create or view a prediction to test chat"
echo "   4. Check browser console for WebSocket connection logs"
echo "   5. Verify real-time messaging works"
echo ""
echo "🔍 What was configured:"
echo "   • dev.fanclubz.app → fan-club-z.onrender.com"
echo "   • Enhanced connection timeouts for Render"
echo "   • Improved CORS for custom domains"
echo "   • Better error handling and logging"
echo ""
echo "📊 After testing successfully on dev, use deploy-to-production.sh"
