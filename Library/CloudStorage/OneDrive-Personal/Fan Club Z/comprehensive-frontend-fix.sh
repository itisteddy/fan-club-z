#!/bin/bash

echo "🔧 Comprehensive Unicode Fix & Frontend Restart"
echo "================================================"
echo ""

# Kill all frontend processes
echo "1️⃣  Stopping all frontend processes..."
pkill -f "vite" 2>/dev/null || true
pkill -f "npm.*dev.*client" 2>/dev/null || true
pkill -f "node.*vite" 2>/dev/null || true
sleep 3

# Clear all caches and temporary files
echo "2️⃣  Clearing all caches..."
cd client
rm -rf node_modules/.vite 2>/dev/null || true
rm -rf .vite 2>/dev/null || true
rm -rf dist 2>/dev/null || true
rm -rf .turbo 2>/dev/null || true

# Force kill port 3000
echo "3️⃣  Force killing port 3000..."
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
sleep 2

# Verify port is free
if lsof -i:3000 >/dev/null 2>&1; then
    echo "❌ Port 3000 still in use, trying harder..."
    sudo lsof -ti:3000 | xargs sudo kill -9 2>/dev/null || true
    sleep 2
fi

echo "4️⃣  Starting fresh frontend server..."
npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅ Frontend restart initiated!"
echo "🖥️  Process ID: $FRONTEND_PID"
echo "🌐 URL: http://localhost:3000"
echo ""

# Wait and test multiple times
for i in {1..10}; do
    echo "⏳ Testing connection (attempt $i/10)..."
    sleep 2
    
    if curl -s http://localhost:3000 >/dev/null 2>&1; then
        echo "✅ Frontend is responding!"
        break
    elif [ $i -eq 10 ]; then
        echo "❌ Frontend not responding after 20 seconds"
    fi
done

echo ""
echo "🧪 Running quick health check..."
sleep 2

# Test if the main page loads
if curl -s http://localhost:3000 | grep -q "html"; then
    echo "✅ HTML content loading correctly"
else
    echo "❌ HTML content not loading"
fi

echo ""
echo "📋 Next Steps:"
echo "1. Open http://localhost:3000 in your browser"
echo "2. Check browser console for errors (F12 > Console)"
echo "3. Look for any Unicode or parsing errors"
echo "4. Test user registration and wallet functionality"
echo ""
echo "🔍 Expected Results:"
echo "- No Unicode escape sequence errors"
echo "- App loads without red error overlay"
echo "- All features work as expected"
echo ""
echo "Press Ctrl+C to stop the frontend server"

# Show logs
echo "📊 Watching for errors..."
sleep 2

# Wait for user to stop
wait
