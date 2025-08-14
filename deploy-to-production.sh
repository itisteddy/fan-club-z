#!/bin/bash

# Deploy to Production Environment
# This script deploys tested changes to production branch for app.fanclubz.app

echo "🚀 Deploying to Production Environment (app.fanclubz.app)"
echo "=========================================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Not in project root directory"
    exit 1
fi

# Confirm with user before production deployment
echo "⚠️  You are about to deploy to PRODUCTION!"
echo "🌐 This will affect: https://app.fanclubz.app"
echo ""
read -p "Have you tested these changes on dev.fanclubz.app? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Please test on development first using deploy-to-dev.sh"
    exit 1
fi

# Check current branch
current_branch=$(git branch --show-current)
echo "📋 Current branch: $current_branch"

# Switch to production branch
echo "🔄 Switching to production branch..."
git checkout main || git checkout production
if [ $? -ne 0 ]; then
    echo "❌ Failed to switch to production branch"
    exit 1
fi

# Pull latest changes
echo "⬇️ Pulling latest production changes..."
git pull origin main || git pull origin production

# Merge development changes
echo "🔀 Merging development changes..."
git merge development
if [ $? -ne 0 ]; then
    echo "❌ Merge conflicts detected. Please resolve manually."
    echo "💡 Run: git status to see conflicts"
    exit 1
fi

# Commit the production deployment
echo "💾 Committing production deployment..."
git commit -m "🚀 PROD: Deploy WebSocket fixes to app.fanclubz.app

Production Deployment:
- WebSocket connection fixes from development testing
- Verified on dev.fanclubz.app environment
- Custom domain routing: app.fanclubz.app → fan-club-z.onrender.com
- Production-ready CORS and connection optimization

Production URLs:
- Frontend: https://app.fanclubz.app
- Backend: https://fan-club-z.onrender.com
- WebSocket: wss://fan-club-z.onrender.com

Verified Features:
- Real-time chat functionality
- Stable WebSocket connections
- Cross-domain communication
- Mobile compatibility
- Error handling and reconnection

Deployment tested on: https://dev.fanclubz.app
Production deployment: $(date -u +"%Y-%m-%d %H:%M:%S UTC")"

# Push to production branch
echo "🚀 Pushing to production..."
git push origin main || git push origin production

if [ $? -ne 0 ]; then
    echo "❌ Failed to push to production"
    exit 1
fi

echo "✅ Production deployment completed successfully!"
echo ""
echo "🔗 The changes will trigger production deployment on:"
echo "   • Render backend: https://fan-club-z.onrender.com"
echo "   • Vercel frontend: https://app.fanclubz.app"
echo ""
echo "🔍 Monitor deployments:"
echo "   • Render: https://dashboard.render.com"
echo "   • Vercel: https://vercel.com/dashboard"
echo ""
echo "🧪 Post-deployment verification:"
echo "   1. Open: https://app.fanclubz.app"
echo "   2. Test user registration/login"
echo "   3. Create or view a prediction"
echo "   4. Verify chat functionality works"
echo "   5. Check browser console for any errors"
echo ""
echo "📊 Production monitoring:"
echo "   • WebSocket connections: Check Render logs"
echo "   • Frontend performance: Check Vercel analytics"
echo "   • User experience: Monitor for error reports"
echo ""
echo "🎉 Production deployment complete!"
echo "🌐 Live at: https://app.fanclubz.app"
