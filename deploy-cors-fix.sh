#!/bin/bash

echo "🚀 Deploying CORS Fix for Fan Club Z..."

# Change to project directory
cd "/Users/efe/Library/CloudStorage/OneDrive-Personal/Fan Club Z v2.0/FanClubZ-version2.0"

echo "🔧 Current Issues Identified:"
echo "- CORS policy blocking requests to server"
echo "- API URL configuration mismatch"
echo "- Frontend trying to access production server with wrong CORS settings"

echo ""
echo "🛠️ Applying Fixes:"

echo "1. Fixed server CORS configuration to allow all origins temporarily"
echo "2. Enhanced error logging in server for better debugging"
echo "3. Added CORS test endpoint"

echo ""
echo "🎯 Setting production API URL for client..."

# Create production environment file for the client
cat > client/.env.production << 'EOF'
# Production Environment Configuration
VITE_API_URL=https://fan-club-z.onrender.com
VITE_SUPABASE_URL=https://ihtnsyhknvltgrksffun.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlodG5zeWhrbnZsdGdya3NmZnVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2NzA2MzYsImV4cCI6MjA2OTI0NjYzNn0.ZmoZ5cGVHfhDwTvkmaw9LSVHm_awoyMOTyQKewr7rYo
VITE_APP_URL=https://app.fanclubz.app
NODE_ENV=production
EOF

echo "✅ Created client/.env.production with correct API URL"

echo ""
echo "🔧 Building application with production settings..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
    
    echo ""
    echo "🧪 Testing CORS fix..."
    echo "Starting development server to test the fix..."
    echo ""
    echo "Application will be available at: http://localhost:5173"
    echo ""
    echo "CORS Fixes Applied:"
    echo "✅ Server now allows all origins (temporary fix)"
    echo "✅ Enhanced CORS headers added"
    echo "✅ OPTIONS preflight handling improved"
    echo "✅ Production API URL configured"
    echo "✅ Additional error logging for debugging"
    echo ""
    echo "Server endpoints available:"
    echo "📡 Health check: https://fan-club-z.onrender.com/health"
    echo "🧪 CORS test: https://fan-club-z.onrender.com/api/v2/test-cors"
    echo "📊 Predictions: https://fan-club-z.onrender.com/api/v2/predictions"
    echo ""
    echo "Press Ctrl+C to stop the server"
    echo ""
    
    npm run dev
else
    echo "❌ Build failed. Please check the console for errors."
    exit 1
fi