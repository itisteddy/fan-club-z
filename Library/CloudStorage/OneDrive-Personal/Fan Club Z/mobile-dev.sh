#!/bin/bash

# Make this script executable
chmod +x "$0"

# Fan Club Z - Mobile Development Startup Script
# This script configures the app for mobile device access on local network

set -e  # Exit on any error

echo "📱 Fan Club Z Mobile Development Environment"
echo "============================================="

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "client" ] || [ ! -d "server" ]; then
    echo "❌ Error: Please run this script from the Fan Club Z root directory"
    exit 1
fi

# Get the local IP address (try multiple interfaces)
LOCAL_IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || ipconfig getifaddr wlan0 2>/dev/null || ipconfig getifaddr eth0 2>/dev/null || echo "172.20.2.210")
echo "🌐 Detected local IP: $LOCAL_IP"
echo "📱 If this IP is wrong, your phone should use the same WiFi network as this computer"

# Free up ports first
echo ""
echo "🔧 Step 1: Freeing up default ports..."
./free-ports.sh

# Check if dependencies are installed
echo ""
echo "📦 Step 2: Checking dependencies..."

if [ ! -d "node_modules" ]; then
    echo "   Installing root dependencies..."
    npm install
fi

if [ ! -d "client/node_modules" ]; then
    echo "   Installing client dependencies..."
    cd client && npm install && cd ..
fi

if [ ! -d "server/node_modules" ]; then
    echo "   Installing server dependencies..."
    cd server && npm install && cd ..
fi

# Create mobile-specific environment configuration
echo ""
echo "🔧 Step 3: Configuring mobile environment..."

# Update client .env.local for mobile access
cat > client/.env.local << EOF
# Mobile Development Configuration
VITE_API_URL=http://$LOCAL_IP:3001/api
VITE_WS_URL=ws://$LOCAL_IP:3001
VITE_BASE_URL=http://$LOCAL_IP:3000
VITE_APP_NAME="Fan Club Z"
VITE_DEMO_MODE=true
VITE_ENABLE_NOTIFICATIONS=true
EOF

# Update server .env.local for mobile access
cat > server/.env.local << EOF
# Mobile Development Configuration
NODE_ENV=development
PORT=3001
HOST=0.0.0.0
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,http://$LOCAL_IP:3000,http://$LOCAL_IP:3001
DATABASE_URL=sqlite3:./dev.db
JWT_SECRET=dev-jwt-secret-change-in-production
JWT_REFRESH_SECRET=dev-jwt-refresh-secret-change-in-production
ENABLE_DEMO_MODE=true
ENABLE_NOTIFICATIONS=true
EOF

echo "✅ Environment configured for mobile access"

# Start the development servers
echo ""
echo "🎯 Step 4: Starting development servers..."
echo "   Frontend: http://localhost:3000"
echo "   Frontend (Mobile): http://$LOCAL_IP:3000"
echo "   Backend:  http://localhost:3001"
echo "   Backend (Mobile):  http://$LOCAL_IP:3001"
echo ""
echo "📱 Mobile Access URLs:"
echo "   Main App: http://$LOCAL_IP:3000"
echo "   API:      http://$LOCAL_IP:3001/api"
echo ""
echo "🔧 To access from your mobile device:"
echo "   1. Make sure your phone is on the same WiFi network"
echo "   2. Open Safari on your phone"
echo "   3. Test connection: http://$LOCAL_IP:3000/mobile-test.html"
echo "   4. If test passes, navigate to: http://$LOCAL_IP:3000"
echo ""
echo "Press Ctrl+C to stop all servers"
echo ""

# Export environment variables for this session
export LOCAL_IP="$LOCAL_IP"

# Start both servers concurrently with mobile configuration
npx concurrently \
  --names "BACKEND,FRONTEND" \
  --prefix-colors "blue,green" \
  "cd server && npm run dev" \
  "cd client && npm run dev -- --host 0.0.0.0 --port 3000"
