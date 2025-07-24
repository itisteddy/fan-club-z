#!/bin/bash

echo "🔄 Fan Club Z - Clean Restart Script"
echo "===================================="
echo ""

# Kill any existing processes
echo "1️⃣  Stopping existing processes..."
pkill -f "vite" 2>/dev/null || true
pkill -f "tsx" 2>/dev/null || true
pkill -f "npm.*dev" 2>/dev/null || true
pkill -f "node.*server" 2>/dev/null || true
sleep 2

# Clear Vite cache
echo "2️⃣  Clearing Vite cache..."
rm -rf client/node_modules/.vite 2>/dev/null || true
rm -rf client/.vite 2>/dev/null || true

# Clear any stuck ports
echo "3️⃣  Freeing up ports 3000 and 3001..."
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
lsof -ti:3001 | xargs kill -9 2>/dev/null || true
sleep 2

echo "4️⃣  Starting backend server..."
cd server && npm run dev &
BACKEND_PID=$!

echo "5️⃣  Waiting for backend to start..."
sleep 5

echo "6️⃣  Starting frontend server..."
cd ../client && npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅ Services started successfully!"
echo "📊 Backend PID: $BACKEND_PID"
echo "🖥️  Frontend PID: $FRONTEND_PID"
echo ""
echo "🌐 Access URLs:"
echo "   Backend:  http://localhost:3001"
echo "   Frontend: http://localhost:3000"
echo "   Health:   http://localhost:3001/api/health"
echo ""
echo "⏳ Waiting 10 seconds for services to fully initialize..."
sleep 10

echo ""
echo "🧪 Running production fixes test..."
echo ""
node ../test-production-fixes.mjs

echo ""
echo "🎯 Services are running. Press Ctrl+C to stop."
echo "📱 You can now test the app at http://localhost:3000"
echo ""

# Wait for user to stop
wait
