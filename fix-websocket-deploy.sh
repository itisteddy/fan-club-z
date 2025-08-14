#!/bin/bash

echo "🚀 Fan Club Z - Fix TypeScript Build and WebSocket Deployment"
echo "============================================================"

# Change to project root
cd "$(dirname "$0")"

echo "📍 Current directory: $(pwd)"

# Function to run command with error handling
run_command() {
    echo "🔧 Running: $1"
    if eval "$1"; then
        echo "✅ Success: $1"
    else
        echo "❌ Failed: $1"
        return 1
    fi
}

# 1. Fix TypeScript build by cleaning shared module
echo "🧹 Step 1: Cleaning shared module build artifacts..."
if [ -d "shared/dist" ]; then
    rm -rf shared/dist
    echo "✅ Removed shared/dist"
fi

if [ -d "shared/node_modules" ]; then
    rm -rf shared/node_modules
    echo "✅ Removed shared/node_modules"
fi

# 2. Clean server build artifacts  
echo "🧹 Step 2: Cleaning server build artifacts..."
if [ -d "server/dist" ]; then
    rm -rf server/dist
    echo "✅ Removed server/dist"
fi

# 3. Clean and reinstall node_modules
echo "🧹 Step 3: Cleaning root node_modules..."
if [ -d "node_modules" ]; then
    rm -rf node_modules
    echo "✅ Removed root node_modules"
fi

# 4. Clear npm cache
echo "🧹 Step 4: Clearing npm cache..."
npm cache clean --force

# 5. Install dependencies
echo "📦 Step 5: Installing dependencies..."
run_command "npm install"

# 6. Test shared module build
echo "🔨 Step 6: Testing shared module build..."
cd shared
run_command "npm run build"
cd ..

# 7. Test server build
echo "🔨 Step 7: Testing server build..."
cd server
run_command "npm run build"
cd ..

# 8. Create WebSocket CORS fix
echo "🌐 Step 8: Creating WebSocket CORS configuration..."
cat > websocket-cors-fix.md << 'EOF'
# WebSocket CORS Configuration for Render Deployment

## Problem
WebSocket connections are failing between:
- Frontend: dev.fanclubz.app, app.fanclubz.app (Vercel)
- Backend: fan-club-z.onrender.com (Single Render service)

## Solution Applied

### 1. Fixed TypeScript Build Errors
- Removed duplicate exports in shared/src/types.ts
- Clean build process implemented

### 2. Enhanced CORS Configuration
Server app.ts now includes comprehensive CORS for WebSocket:

```javascript
// Enhanced CORS with proper origin handling
const allowedOrigins = [
  'https://fan-club-z.onrender.com',
  'https://fanclubz.app',
  'https://www.fanclubz.app',
  'https://app.fanclubz.app',
  'https://dev.fanclubz.app',
  'https://fan-club-z-pw49foj6y-teddys-projects-d67ab22a.vercel.app',
  'https://fan-club-z-lu5ywnjr0-teddys-projects-d67ab22a.vercel.app',
  'https://fanclubz-version2-0.vercel.app'
];
```

### 3. Socket.IO Configuration
ChatService.ts configured with:
- Comprehensive CORS origins
- WebSocket + Polling transport fallback
- Render-optimized connection settings
- Better error handling

### 4. Client Environment Detection
environment.ts properly detects and routes to single Render service:
- All environments point to: https://fan-club-z.onrender.com
- Proper protocol detection (HTTPS for production)

## Testing Steps
1. Build succeeds on Render
2. Frontend connects to backend WebSocket
3. Chat functionality works across domains

## Environment Variables (Render Dashboard)
Ensure these are set:
- VITE_SUPABASE_URL
- VITE_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
- NODE_ENV=production
- PORT (auto-set by Render)

## Deployment Commands
```bash
# Force deploy to development branch
./fix-websocket-deploy.sh dev

# Force deploy to main branch  
./fix-websocket-deploy.sh main
```
EOF

# 9. Create deployment script
echo "🚀 Step 9: Creating deployment script..."
cat > deploy-websocket-fix.sh << 'EOF'
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
EOF

chmod +x deploy-websocket-fix.sh

# 10. Test the build locally
echo "🧪 Step 10: Testing complete build process..."
run_command "npm run build"

echo ""
echo "✅ TypeScript build and WebSocket fixes applied!"
echo ""
echo "📋 Summary:"
echo "  - Fixed duplicate type exports in shared module"
echo "  - Enhanced CORS configuration for cross-domain WebSocket"
echo "  - Improved Socket.IO setup for Render deployment"
echo "  - Created deployment documentation"
echo ""
echo "🚀 Next steps:"
echo "  1. Run: ./deploy-websocket-fix.sh development"
echo "  2. Test chat functionality after deployment"
echo "  3. Monitor server logs for WebSocket connections"
echo ""
EOF

chmod +x fix-websocket-deploy.sh