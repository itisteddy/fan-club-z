#!/bin/bash

# Complete Chat Functionality Deployment Script
# This script ensures full WebSocket + Chat functionality with Supabase

set -e

echo "🚀 Starting complete chat functionality deployment..."

# Function to log with timestamp
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    log "❌ Error: package.json not found. Make sure you're in the project root."
    exit 1
fi

log "🔍 Verifying project structure..."

# Verify key files exist
key_files=(
    "server/src/index-production.js"
    "server/src/services/ChatService.ts"
    "client/src/store/chatStore.ts"
    "supabase-chat-schema.sql"
    "CHAT_CONFIGURATION_GUIDE.md"
)

for file in "${key_files[@]}"; do
    if [ ! -f "$file" ]; then
        log "❌ Missing key file: $file"
        exit 1
    fi
    log "✅ Found: $file"
done

log "📦 Installing dependencies..."
npm install

log "🔨 Building shared package..."
cd shared && npm install && npm run build && cd ..

log "🖥️ Installing server dependencies..."
cd server && npm install && cd ..

log "📱 Installing client dependencies..."
cd client && npm install && cd ..

log "🧪 Testing shared package import..."
node server/test-shared-import.js

log "🔄 Committing all changes..."
git add .
git commit -m "feat: Complete chat functionality deployment with WebSocket + Supabase integration

- ✅ Fixed Render deployment with minimal production server
- ✅ Enhanced WebSocket chat service with full Supabase integration
- ✅ Real-time messaging with persistence
- ✅ User authentication and room management
- ✅ Production-ready CORS and error handling
- ✅ Comprehensive chat features (typing, reactions, participants)
- ✅ Mobile-optimized client configuration

Ready for Supabase environment variable configuration in Render dashboard." || log "ℹ️ No changes to commit"

log "🌍 Pushing to development branch..."
git push origin development

echo ""
echo "✅ DEPLOYMENT COMPLETE!"
echo ""
echo "🎯 NEXT STEPS TO ENABLE FULL CHAT FUNCTIONALITY:"
echo ""
echo "1. 🔧 Configure Environment Variables in Render:"
echo "   Go to: https://dashboard.render.com → fanclubz-backend → Environment"
echo ""
echo "   Add these variables:"
echo "   SUPABASE_URL=https://ihtnsyhknvltgrksffun.supabase.co"
echo "   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlodG5zeWhrbnZsdGdya3NmZnVuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzY3MDYzNiwiZXhwIjoyMDY5MjQ2NjM2fQ.w0Yr9MoA7Sj1c19lXD7te_Q6vmtY4dRAyxaS6yN8sTY"
echo "   VITE_SUPABASE_URL=https://ihtnsyhknvltgrksffun.supabase.co"
echo "   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlodG5zeWhrbnZsdGdya3NmZnVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2NzA2MzYsImV4cCI6MjA2OTI0NjYzNn0.ZmoZ5cGVHfhDwTvkmaw9LSVHm_awoyMOTyQKewr7rYo"
echo "   ENABLE_WEBSOCKET=true"
echo "   JWT_SECRET=sDrK8jUKE/Tys73gKROTAQipav7bHB4IT9x+5SFht1aQUOfkxKsIKw3y7XvDax5/Nof5fiz+iBblq5oDq0bsJg=="
echo ""
echo "2. 🗄️ Verify Supabase Database Schema:"
echo "   Go to: https://supabase.com/dashboard → Your Project → SQL Editor"
echo "   Run the contents of: supabase-chat-schema.sql"
echo ""
echo "3. ✅ Test the Deployment:"
echo "   After adding environment variables, test with:"
echo "   curl https://fan-club-z.onrender.com/health"
echo ""
echo "4. 🎉 Expected Results:"
echo "   - Server logs show: 'WebSocket Chat: Enabled'"
echo "   - Health endpoint shows: websocket: 'enabled'"
echo "   - Frontend connects to WebSocket automatically"
echo "   - Real-time chat functionality works"
echo ""
echo "📖 For detailed instructions, see: CHAT_CONFIGURATION_GUIDE.md"
echo ""
echo "🔗 Useful Links:"
echo "   Render Dashboard: https://dashboard.render.com"
echo "   Supabase Dashboard: https://supabase.com/dashboard"
echo "   Server Health: https://fan-club-z.onrender.com/health"
echo "   Frontend App: https://fanclubz-version2-0.vercel.app"
echo ""
