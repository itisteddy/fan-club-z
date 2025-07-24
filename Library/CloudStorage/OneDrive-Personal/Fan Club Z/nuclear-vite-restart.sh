#!/bin/bash

echo "🔥 NUCLEAR VITE RESTART - Force Port 5001"
echo "======================================\n"

echo "1️⃣ AGGRESSIVE process killing..."
pkill -9 -f "vite" 2>/dev/null || true
pkill -9 -f "tsx" 2>/dev/null || true
pkill -9 -f "npm.*dev" 2>/dev/null || true
sleep 5

echo "2️⃣ Clearing ALL possible caches..."
cd client
rm -rf node_modules/.vite
rm -rf node_modules/.cache
rm -rf dist
rm -rf .vite
rm -rf .cache

echo "3️⃣ Replacing Vite config with CLEAN version..."
mv vite.config.ts vite.config.OLD.ts
mv vite.config.NEW.ts vite.config.ts

echo "4️⃣ Verifying new config targets port 5001..."
grep -n "localhost:5001" vite.config.ts

echo "\n5️⃣ Starting backend on port 5001..."
cd ../server
npm run dev &
BACKEND_PID=$!
sleep 8

echo "6️⃣ Testing backend health directly..."
curl -s http://localhost:5001/api/health | head -50

echo "\n7️⃣ Starting frontend with COMPLETELY FRESH config..."
cd ../client
npm run dev -- --force &
FRONTEND_PID=$!

echo "\n⏳ Waiting for fresh Vite startup..."
sleep 15

echo "\n8️⃣ FINAL TEST - Frontend proxy to backend..."
echo "Testing proxy: http://localhost:3000/api/health"
PROXY_RESULT=$(curl -s -w "%{http_code}" http://localhost:3000/api/health)
PROXY_CODE="${PROXY_RESULT: -3}"

if [ "$PROXY_CODE" = "200" ]; then
    echo "\n🎉 SUCCESS! Proxy finally working: HTTP $PROXY_CODE"
    echo "Response: ${PROXY_RESULT%???}"
    echo "\n✅ NOW OPEN BROWSER: http://localhost:3000"
    echo "✅ Should show GREEN 'Backend server connected'"
else
    echo "\n❌ STILL FAILING: HTTP $PROXY_CODE"
    echo "Response: ${PROXY_RESULT%???}"
    echo "\n🔍 Something is still wrong with Vite configuration"
fi

echo "\n🛑 Press Ctrl+C to stop servers"

cleanup() {
    echo "\n🛑 Cleanup..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
    exit 0
}

trap cleanup SIGINT SIGTERM
wait
