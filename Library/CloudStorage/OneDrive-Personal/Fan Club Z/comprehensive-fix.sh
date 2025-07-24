#!/bin/bash

echo "🔧 Comprehensive Fix: TypeScript Errors + Port Configuration"
echo "=========================================================\n"

echo "1️⃣ Stopping all existing servers..."
# Kill any existing processes on ports 3000 and 5001
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
lsof -ti:5001 | xargs kill -9 2>/dev/null || true

# Wait for processes to fully terminate
sleep 3
echo "✅ All servers stopped\n"

echo "2️⃣ Rebuilding server with TypeScript fixes..."
cd server
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Server build failed! Check TypeScript errors above."
    exit 1
fi
echo "✅ Server built successfully\n"

echo "3️⃣ Starting backend server on port 5001..."
npm run dev &
BACKEND_PID=$!

# Wait for backend to initialize
echo "⏳ Waiting for backend to initialize..."
sleep 5

echo "4️⃣ Testing backend health endpoint..."
HEALTH_TEST=$(curl -s -w "%{http_code}" http://localhost:5001/api/health)
HTTP_CODE="${HEALTH_TEST: -3}"
RESPONSE_BODY="${HEALTH_TEST%???}"

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Backend health endpoint working! HTTP $HTTP_CODE"
    echo "   Response: $RESPONSE_BODY"
else
    echo "❌ Backend health endpoint failed! HTTP $HTTP_CODE"
    echo "   Response: $RESPONSE_BODY"
    echo "   Check server logs above for errors"
fi

echo "\n5️⃣ Starting frontend server on port 3000..."
cd ../client
npm run dev &
FRONTEND_PID=$!

echo "⏳ Waiting for frontend to initialize..."
sleep 5

echo "\n6️⃣ Testing frontend proxy to backend..."
FRONTEND_HEALTH=$(curl -s -w "%{http_code}" http://localhost:3000/api/health)
FRONTEND_CODE="${FRONTEND_HEALTH: -3}"

if [ "$FRONTEND_CODE" = "200" ]; then
    echo "✅ Frontend proxy working! HTTP $FRONTEND_CODE"
else
    echo "❌ Frontend proxy failed! HTTP $FRONTEND_CODE"
fi

echo "\n🎉 Comprehensive fix applied!"
echo "📱 Frontend: http://localhost:3000"
echo "🔗 Backend API: http://localhost:5001/api"
echo "🏥 Backend Health: http://localhost:5001/api/health"

echo "\n🧪 Final Test Results:"
if [ "$HTTP_CODE" = "200" ] && [ "$FRONTEND_CODE" = "200" ]; then
    echo "✅ All systems working correctly!"
    echo "   - TypeScript compilation: Fixed"
    echo "   - Port configuration: Aligned (Backend: 5001, Frontend: 3000)"
    echo "   - Health endpoint: Working"
    echo "   - Frontend proxy: Working"
    echo "\n🎯 Ready for testing!"
    echo "   1. Open http://localhost:3000"
    echo "   2. Look for GREEN 'Backend server connected' status"
    echo "   3. Try logging in with: fausty@fcz.app / demo123"
else
    echo "❌ Some issues remain:"
    [ "$HTTP_CODE" != "200" ] && echo "   - Backend health endpoint not working"
    [ "$FRONTEND_CODE" != "200" ] && echo "   - Frontend proxy not working"
    echo "\n🔍 Check the error logs above for details"
fi

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
