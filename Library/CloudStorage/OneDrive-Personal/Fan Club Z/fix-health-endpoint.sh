#!/bin/bash

echo "🔧 Issue #3 Fix: Health Endpoint Middleware Bypass"
echo "================================================\n"

echo "1️⃣ Stopping servers..."
# Kill any existing processes on ports 3000 and 5001
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
lsof -ti:5001 | xargs kill -9 2>/dev/null || true

# Wait for processes to fully terminate
sleep 2

echo "✅ Ports cleared\n"

echo "2️⃣ Rebuilding server with health endpoint fix..."
cd server
npm run build

echo "\n3️⃣ Starting backend server with fixed health endpoint..."
npm run dev &
BACKEND_PID=$!

echo "⏳ Waiting for backend to initialize..."
sleep 5

echo "\n4️⃣ Testing health endpoint..."
curl -s http://localhost:5001/api/health | jq . || echo "Health endpoint test (will retry in browser)"

echo "\n5️⃣ Starting frontend server..."
cd ../client
npm run dev &
FRONTEND_PID=$!

echo "\n✅ Both servers restarted with health endpoint fix!"
echo "📱 Frontend: http://localhost:3000"
echo "🔗 Backend API: http://localhost:5001/api"
echo "🏥 Backend Health: http://localhost:5001/api/health"
echo "\n🧪 Test Instructions:"
echo "1. Open http://localhost:3000"
echo "2. Check that the connection indicator shows 'Backend server connected'"
echo "3. Try logging in with: fausty@fcz.app / demo123"
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
