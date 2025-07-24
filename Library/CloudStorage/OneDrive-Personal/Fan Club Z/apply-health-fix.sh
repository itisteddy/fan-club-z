#!/bin/bash

echo "🔄 Applying Health Endpoint Fix - Server Restart"
echo "===============================================\n"

# Kill any existing processes on ports 3000 and 5001
echo "1️⃣ Stopping existing servers..."
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
lsof -ti:5001 | xargs kill -9 2>/dev/null || true

# Wait for processes to fully terminate
sleep 3
echo "✅ Servers stopped\n"

# Rebuild the server to apply the health endpoint fix
echo "2️⃣ Rebuilding server with health endpoint fix..."
cd server
npm run build
echo "✅ Server rebuilt\n"

# Start backend server first
echo "3️⃣ Starting backend server on port 5001..."
npm run dev &
BACKEND_PID=$!

# Wait for backend to initialize
echo "⏳ Waiting for backend to initialize..."
sleep 5

# Test the health endpoint
echo "4️⃣ Testing health endpoint..."
HEALTH_TEST=$(curl -s -w "%{http_code}" http://localhost:5001/api/health)
HTTP_CODE="${HEALTH_TEST: -3}"

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Health endpoint working! HTTP $HTTP_CODE"
else
    echo "❌ Health endpoint still failing! HTTP $HTTP_CODE"
fi

# Start frontend server
echo "\n5️⃣ Starting frontend server on port 3000..."
cd ../client
npm run dev &
FRONTEND_PID=$!

echo "\n🎉 Servers restarted with health endpoint fix!"
echo "📱 Frontend: http://localhost:3000"
echo "🔗 Backend API: http://localhost:5001/api"
echo "🏥 Backend Health: http://localhost:5001/api/health"

echo "\n🧪 Test Instructions:"
echo "1. Open http://localhost:3000"
echo "2. Look for GREEN 'Backend server connected' status"
echo "3. Login form should be ENABLED (not grayed out)"
echo "4. Try logging in with: fausty@fcz.app / demo123"

echo "\n🛑 Press Ctrl+C to stop both servers"

# Function to handle cleanup on script exit
cleanup() {
    echo "\n🛑 Shutting down servers..."
    kill $BACKEND_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Wait for both processes
wait
