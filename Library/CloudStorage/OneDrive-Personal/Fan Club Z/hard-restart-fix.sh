#!/bin/bash

# Fan Club Z - Hard Restart Fix Script
# This script forces a complete restart to resolve cached configuration issues

echo "🔄 Fan Club Z - Hard Restart Fix"
echo "================================"
echo "This will force kill all processes and restart with fresh config"
echo ""

# Step 1: Force kill all Node/Vite processes
echo "🛑 Step 1: Force killing all Node/Vite processes..."
pkill -9 -f "node" 2>/dev/null || true
pkill -9 -f "tsx" 2>/dev/null || true
pkill -9 -f "vite" 2>/dev/null || true
pkill -9 -f "concurrently" 2>/dev/null || true
sleep 5

# Step 2: Clear all caches
echo "🧹 Step 2: Clearing all caches..."
cd client && rm -rf node_modules/.vite 2>/dev/null || true
cd ../server && rm -rf node_modules/.cache 2>/dev/null || true
cd ..

# Step 3: Verify ports are free
echo "🔍 Step 3: Verifying ports are free..."
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
lsof -ti:5001 | xargs kill -9 2>/dev/null || true
sleep 3

# Step 4: Start backend first
echo "🚀 Step 4: Starting backend on port 5001..."
cd server && npm run dev &
BACKEND_PID=$!
echo "Backend PID: $BACKEND_PID"

# Wait for backend to start
echo "⏳ Waiting for backend to initialize..."
sleep 10

# Test backend health
echo "🔍 Testing backend health..."
if curl -s http://localhost:5001/api/health >/dev/null; then
    echo "✅ Backend health check passed"
else
    echo "❌ Backend health check failed"
    exit 1
fi

# Step 5: Start frontend with fresh config
echo "🌐 Step 5: Starting frontend with fresh config..."
cd ../client && npm run dev &
FRONTEND_PID=$!
echo "Frontend PID: $FRONTEND_PID"

# Wait for frontend to start
echo "⏳ Waiting for frontend to initialize..."
sleep 10

# Step 6: Comprehensive testing
echo "🧪 Step 6: Comprehensive testing..."
echo ""

# Test backend directly
echo "📡 Testing backend endpoints (direct):"
if curl -s http://localhost:5001/api/health >/dev/null; then
    echo "✅ Backend health endpoint working"
else
    echo "❌ Backend health endpoint failed"
fi

# Test frontend proxy
echo ""
echo "🌐 Testing frontend proxy endpoints:"
if curl -s http://localhost:3000/api/health >/dev/null; then
    echo "✅ Frontend proxy working"
else
    echo "❌ Frontend proxy failed"
fi

# Test frontend itself
echo ""
echo "📱 Testing frontend server:"
if curl -s http://localhost:3000 >/dev/null; then
    echo "✅ Frontend server responding"
else
    echo "❌ Frontend server not responding"
fi

echo ""
echo "🎉 FINAL STATUS"
echo "=============="
echo ""

# Final status check
BACKEND_WORKING=false
FRONTEND_WORKING=false
PROXY_WORKING=false

if curl -s http://localhost:5001/api/health >/dev/null; then
    BACKEND_WORKING=true
fi

if curl -s http://localhost:3000 >/dev/null; then
    FRONTEND_WORKING=true
fi

if curl -s http://localhost:3000/api/health >/dev/null; then
    PROXY_WORKING=true
fi

if [ "$BACKEND_WORKING" = true ] && [ "$FRONTEND_WORKING" = true ] && [ "$PROXY_WORKING" = true ]; then
    echo "🎯 ALL SYSTEMS WORKING!"
    echo "======================"
    echo ""
    echo "✅ Backend Server: http://localhost:5001"
    echo "✅ Frontend Server: http://localhost:3000"
    echo "✅ API Proxy: Working correctly"
    echo "✅ Health Endpoint: Responding"
    echo ""
    echo "🧪 Ready for Testing:"
    echo "   1. Open http://localhost:3000"
    echo "   2. Look for GREEN 'Backend server connected'"
    echo "   3. No more 500 errors in console"
    echo "   4. No more ECONNREFUSED in terminal"
    echo ""
    echo "🛑 To stop servers: pkill -f 'tsx|vite'"
else
    echo "⚠️  SOME ISSUES REMAIN"
    echo "====================="
    echo ""
    echo "Backend working: $BACKEND_WORKING"
    echo "Frontend working: $FRONTEND_WORKING"
    echo "Proxy working: $PROXY_WORKING"
    echo ""
    echo "🔧 Troubleshooting needed..."
fi

echo ""
echo "✅ Hard restart complete!"
