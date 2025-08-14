#!/bin/bash

# ============================================================================
# Fan Club Z WebSocket Deployment Fix Script
# ============================================================================
# This script deploys the WebSocket fixes to Render
# Run this from the project root directory

set -e

echo "🚀 Deploying Fan Club Z WebSocket fixes to Render..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
  echo "❌ Error: Not in project root directory. Please run from Fan Club Z v2.0 root."
  exit 1
fi

# Stage all changes
echo "📋 Staging changes..."
git add .

# Commit the WebSocket fixes
echo "💾 Committing WebSocket deployment fixes..."
git commit -m "🔧 Fix WebSocket deployment issues for Render

- Update server to bind to 0.0.0.0 with correct PORT
- Fix client Socket.IO URLs for production (no port numbers)
- Add comprehensive CORS for Render deployment
- Improve error handling for Supabase connection failures
- Add environment validation for required variables
- Update startup scripts for production deployment

Critical fixes:
✅ Server binds to 0.0.0.0:PORT for Render compatibility  
✅ Client uses wss://fan-club-z.onrender.com (no port)
✅ Production CORS includes all deployment URLs
✅ Environment validation prevents startup failures
✅ Fallback handling when Supabase is unavailable

Addresses WebSocket connection failures on Render platform."

# Push to remote
echo "🌐 Pushing to remote repository..."
git push origin main

# Show next steps
echo ""
echo "✅ WebSocket fixes deployed successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Go to your Render dashboard: https://dashboard.render.com"
echo "2. Find your Fan Club Z service"
echo "3. Go to Environment tab"
echo "4. Add these environment variables:"
echo ""
echo "   Required variables:"
echo "   NODE_ENV=production"
echo "   VITE_SUPABASE_URL=https://ihtnsyhknvltgrksffun.supabase.co"
echo "   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlodG5zeWhrbnZsdGdya3NmZnVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2NzA2MzYsImV4cCI6MjA2OTI0NjYzNn0.ZmoZ5cGVHfhDwTvkmaw9LSVHm_awoyMOTyQKewr7rYo"
echo "   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlodG5zeWhrbnZsdGdya3NmZnVuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzY3MDYzNiwiZXhwIjoyMDY5MjQ2NjM2fQ.w0Yr9MoA7Sj1c19lXD7te_Q6vmtY4dRAyxaS6yN8sTY"
echo ""
echo "5. Click 'Save & Deploy' to trigger a new deployment"
echo "6. Monitor the deployment logs for any errors"
echo "7. Test WebSocket connection at: https://fan-club-z.onrender.com/socket.io/health"
echo ""
echo "🔧 Troubleshooting:"
echo "- Check Render logs if deployment fails"
echo "- Verify all environment variables are set correctly"
echo "- Test health endpoint: https://fan-club-z.onrender.com/health"
echo "- Test WebSocket endpoint: https://fan-club-z.onrender.com/ws"
echo ""
echo "📞 If issues persist, check the browser console for specific error messages."
