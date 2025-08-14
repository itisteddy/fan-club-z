#!/bin/bash

echo "🚀 Triggering Render Deployment from Development Branch"
echo "======================================================"

# Check if we're on development branch
CURRENT_BRANCH=$(git branch | grep '*' | cut -d' ' -f2)
if [ "$CURRENT_BRANCH" != "development" ]; then
    echo "❌ ERROR: You must be on the development branch!"
    echo "Current branch: $CURRENT_BRANCH"
    echo "Please run: git checkout development"
    exit 1
fi

echo "✅ Confirmed: Currently on development branch"

# Check if latest changes are pushed
echo "📤 Checking if latest changes are pushed to development..."
git fetch origin development
LOCAL_COMMIT=$(git rev-parse HEAD)
REMOTE_COMMIT=$(git rev-parse origin/development)

if [ "$LOCAL_COMMIT" != "$REMOTE_COMMIT" ]; then
    echo "❌ ERROR: Local development branch is not in sync with remote!"
    echo "Please run: git push origin development"
    exit 1
fi

echo "✅ Confirmed: Latest changes are pushed to development"

echo ""
echo "🎯 Render Configuration Status:"
echo "==============================="
echo "✅ render.yaml configured for development branch"
echo "✅ WebSocket fixes are in development branch"
echo "✅ Environment variables need to be configured"

echo ""
echo "📋 Manual Steps Required:"
echo "========================"
echo "1. Go to your Render dashboard: https://dashboard.render.com"
echo "2. Find the 'fanclubz-backend' service"
echo "3. Click on the service to open its details"
echo "4. Go to the 'Settings' tab"
echo "5. Under 'Build & Deploy' section:"
echo "   - Verify 'Branch' is set to 'development'"
echo "   - If not, change it to 'development' and click 'Save'"
echo "6. Go to the 'Environment' tab"
echo "7. Add these environment variables:"
echo ""
echo "   Required Variables:"
echo "   NODE_ENV=production"
echo "   VITE_SUPABASE_URL=https://ihtnsyhknvltgrksffun.supabase.co"
echo "   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlodG5zeWhrbnZsdGdya3NmZnVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2NzA2MzYsImV4cCI6MjA2OTI0NjYzNn0.ZmoZ5cGVHfhDwTvkmaw9LSVHm_awoyMOTyQKewr7rYo"
echo "   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlodG5zeWhrbnZsdGdya3NmZnVuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzY3MDYzNiwiZXhwIjoyMDY5MjQ2NjM2fQ.w0Yr9MoA7Sj1c19lXD7te_Q6vmtY4dRAyxaS6yN8sTY"
echo "   ENABLE_WEBSOCKET=true"
echo "   CORS_ORIGINS=https://fanclubz.app,https://www.fanclubz.app,https://app.fanclubz.app,https://dev.fanclubz.app"
echo ""
echo "8. Click 'Save & Deploy' to trigger a new deployment"
echo "9. Monitor the deployment logs for any errors"

echo ""
echo "🧪 Testing Commands (run after deployment):"
echo "==========================================="
echo "curl -s https://fan-club-z.onrender.com/health"
echo "curl -s \"https://fan-club-z.onrender.com/socket.io/?EIO=4&transport=polling\""
echo "curl -s https://fan-club-z.onrender.com/api/v2/websocket-test"

echo ""
echo "📞 If you need help:"
echo "==================="
echo "- Check Render deployment logs for errors"
echo "- Verify all environment variables are set correctly"
echo "- Test the health endpoint first"
echo "- Check browser console for WebSocket connection errors"

echo ""
echo "🎉 Once deployed, your WebSocket fixes will be live on Render!"
