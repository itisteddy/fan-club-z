#!/bin/bash

echo "🔄 Restarting Frontend to Fix Unicode Error"
echo "============================================"
echo ""

# Kill frontend processes
echo "1️⃣  Stopping frontend processes..."
pkill -f "vite" 2>/dev/null || true
pkill -f "npm.*dev.*client" 2>/dev/null || true
sleep 2

# Clear Vite cache
echo "2️⃣  Clearing Vite cache..."
cd client
rm -rf node_modules/.vite 2>/dev/null || true
rm -rf .vite 2>/dev/null || true

# Free up port 3000
echo "3️⃣  Freeing port 3000..."
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
sleep 2

echo "4️⃣  Starting frontend server..."
npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅ Frontend restarted!"
echo "🖥️  Process ID: $FRONTEND_PID"
echo "🌐 URL: http://localhost:3000"
echo ""
echo "⏳ Waiting 5 seconds for server to start..."
sleep 5

echo ""
echo "🧪 Testing frontend..."
curl -s http://localhost:3000 > /dev/null && echo "✅ Frontend is responding!" || echo "❌ Frontend not responding yet"

echo ""
echo "📱 You can now test the app at: http://localhost:3000"
echo "🔍 Check browser console for any remaining errors"
echo ""
echo "Press Ctrl+C to stop the frontend server"

# Wait for user to stop
wait
