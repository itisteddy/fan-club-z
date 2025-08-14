#!/bin/bash

BRANCH=${1:-development}

echo "🚀 Deploying WebSocket fixes to Render ($BRANCH branch)..."

# Add and commit changes
git add .
git status

echo "📝 Committing WebSocket fixes..."
git commit -m "fix: resolve TypeScript build errors and WebSocket CORS configuration

- Remove duplicate exports in shared/src/types.ts to fix TS compilation
- Enhanced CORS configuration for WebSocket connections
- Improved Socket.IO setup for Render deployment
- Better error handling and connection diagnostics
- Single service architecture for free tier compatibility

Resolves: TypeScript build errors, WebSocket connection issues"

# Push to the specified branch
echo "📤 Pushing to $BRANCH branch..."
git push origin $BRANCH

echo "✅ Deployment initiated!"
echo "🔗 Check deployment status at: https://dashboard.render.com/"
echo "🔗 App URL: https://fan-club-z.onrender.com/"
echo "🔗 Frontend URLs: dev.fanclubz.app, app.fanclubz.app"

# Open deployment dashboard
if command -v open >/dev/null 2>&1; then
    echo "🌐 Opening Render dashboard..."
    open "https://dashboard.render.com/"
fi