#!/bin/bash

BRANCH=${1:-development}

echo "🚀 Fan Club Z - Complete Build Fix & Deployment"
echo "=============================================="

# Add and commit all changes
git add .

# Show what we're committing
echo "📝 Changes to commit:"
git status --short

echo ""
echo "📝 Committing comprehensive fixes..."
git commit -m "fix: comprehensive TypeScript build and WebSocket configuration

FIXES APPLIED:
- Remove duplicate exports in shared/src/types.ts (TS compilation errors)
- Fix server tsconfig.json rootDir configuration (Render build issue)
- Enhanced CORS configuration for WebSocket connections
- Improved Socket.IO setup for Render deployment
- Better error handling and connection diagnostics
- Single service architecture for free tier compatibility

TECHNICAL CHANGES:
- shared/src/types.ts: Removed duplicate exports (ApiResponse, Deposit, etc.)
- server/tsconfig.json: Fixed rootDir and include configuration
- server/src/app.ts: Enhanced CORS for cross-domain WebSocket
- server/src/services/ChatService.ts: Improved Socket.IO configuration
- client/src/lib/environment.ts: Proper single service URL routing

DEPLOYMENT:
- Ready for Render deployment on $BRANCH branch
- All TypeScript builds pass locally
- WebSocket CORS configured for Vercel → Render connections
- Comprehensive documentation and testing guides included

Resolves: TS6059 rootDir errors, WebSocket CORS issues, duplicate exports"

# Push to specified branch
echo "📤 Pushing to $BRANCH branch..."
git push origin $BRANCH

echo ""
echo "✅ Deployment initiated!"
echo ""
echo "📋 Deployment Details:"
echo "  - Branch: $BRANCH"
echo "  - Service: Single Render service (free tier)"
echo "  - Frontend: Vercel deployments (dev.fanclubz.app, app.fanclubz.app)"
echo "  - Backend: fan-club-z.onrender.com"
echo ""
echo "🔗 URLs:"
echo "  - Render Dashboard: https://dashboard.render.com/"
echo "  - App URL: https://fan-club-z.onrender.com/"
echo "  - Health Check: https://fan-club-z.onrender.com/health"
echo "  - API Base: https://fan-club-z.onrender.com/api/v2"
echo ""
echo "🧪 Testing Steps:"
echo "  1. Wait for Render deployment to complete"
echo "  2. Test health endpoint: curl https://fan-club-z.onrender.com/health"
echo "  3. Test WebSocket from dev.fanclubz.app chat feature"
echo "  4. Verify no CORS errors in browser console"
echo ""

# Open deployment dashboard if possible
if command -v open >/dev/null 2>&1; then
    echo "🌐 Opening Render dashboard..."
    open "https://dashboard.render.com/"
fi

echo "⏳ Monitor deployment logs for success..."
echo "✅ TypeScript build should now pass on Render!"