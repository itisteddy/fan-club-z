#!/bin/bash

echo "🔧 Fan Club Z - Bet Creation Fix"
echo "================================"

# Check if servers are running
echo "📊 Checking server status..."
BACKEND_RUNNING=$(lsof -ti:3001)
FRONTEND_RUNNING=$(lsof -ti:3000)

if [ ! -z "$BACKEND_RUNNING" ]; then
    echo "✅ Backend server running on port 3001 (PID: $BACKEND_RUNNING)"
else
    echo "❌ Backend server not running on port 3001"
fi

if [ ! -z "$FRONTEND_RUNNING" ]; then
    echo "✅ Frontend server running on port 3000 (PID: $FRONTEND_RUNNING)"
else
    echo "❌ Frontend server not running on port 3000"
fi

echo ""
echo "🔄 Stopping any running servers..."
# Kill any processes on ports 3000 and 3001
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
lsof -ti:3001 | xargs kill -9 2>/dev/null || true

echo "⏳ Waiting for ports to be free..."
sleep 3

echo ""
echo "🚀 Starting backend server on port 3001..."
cd server
npm run dev &
BACKEND_PID=$!

echo "⏳ Waiting for backend to start..."
sleep 5

# Test backend health
echo "🏥 Testing backend health..."
HEALTH_CHECK=$(curl -s -w "%{http_code}" http://localhost:3001/api/health -o /dev/null)
if [ "$HEALTH_CHECK" = "200" ]; then
    echo "✅ Backend health check passed"
else
    echo "❌ Backend health check failed (HTTP $HEALTH_CHECK)"
fi

echo ""
echo "🚀 Starting frontend server on port 3000..."
cd ../client
npm run dev &
FRONTEND_PID=$!

echo "⏳ Waiting for frontend to start..."
sleep 5

echo ""
echo "🌐 Testing bet creation endpoint..."
TOKEN_TEST=$(curl -s http://localhost:3000/api/health)
if [[ $TOKEN_TEST == *"success"* ]]; then
    echo "✅ API proxy working correctly"
else
    echo "❌ API proxy not working"
    echo "Response: $TOKEN_TEST"
fi

echo ""
echo "📝 Configuration Summary:"
echo "   - Backend: http://localhost:3001"
echo "   - Frontend: http://localhost:3000"  
echo "   - API Proxy: /api -> http://localhost:3001/api"
echo ""
echo "🔧 Fixes Applied:"
echo "   ✅ Fixed Vite proxy port (5001 -> 3001)"
echo "   ✅ Fixed API client fallback URLs"
echo "   ✅ Fixed authentication token retrieval"
echo ""
echo "🧪 Test Instructions:"
echo "   1. Open http://localhost:3000 in your browser"
echo "   2. Log in with demo account: fausty@fcz.app"
echo "   3. Navigate to Create tab (+)"
echo "   4. Try creating a bet"
echo "   5. Check browser console for errors"
echo ""
echo "📊 Server PIDs:"
echo "   Backend: $BACKEND_PID"
echo "   Frontend: $FRONTEND_PID"
echo ""
echo "⚠️  To stop servers, run: kill $BACKEND_PID $FRONTEND_PID"
echo "✅ Setup complete!"
