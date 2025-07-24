#!/bin/bash

echo "🔧 INFINITE LOOP FIX - Quick Frontend Restart"
echo "============================================="
echo ""

echo "🚨 ISSUE IDENTIFIED AND FIXED:"
echo "   ❌ WalletTab.tsx had infinite useEffect loop"
echo "   ❌ Functions in dependency array were changing on every render"
echo "   ❌ Caused continuous API calls and rate limiting (429 errors)"
echo ""

echo "✅ FIXES APPLIED:"
echo "   1. Removed function dependencies from useEffect"
echo "   2. Added dataLoaded state to prevent duplicate API calls"
echo "   3. Added rate limiting (2-second minimum between calls)"
echo "   4. Fixed dependency array to only depend on user.id"
echo ""

echo "1️⃣  Stopping frontend..."
pkill -f "vite" 2>/dev/null || true
sleep 2

echo "2️⃣  Clearing cache..."
cd client && rm -rf node_modules/.vite .vite 2>/dev/null || true

echo "3️⃣  Starting frontend with infinite loop fix..."
npm run dev &

echo ""
echo "⏳ Waiting for frontend to start..."
sleep 6

echo ""
echo "🧪 Testing API call frequency..."
echo "   (Check terminal logs - should see MUCH fewer API calls now)"
echo ""

if curl -s http://localhost:3000 >/dev/null 2>&1; then
    echo "✅ Frontend is running!"
    echo ""
    echo "📊 EXPECTED BEHAVIOR NOW:"
    echo "   ✅ API calls only when first loading wallet"
    echo "   ✅ No continuous requests in background"
    echo "   ✅ No 429 rate limit errors"
    echo "   ✅ Much cleaner console logs"
    echo "   ✅ Better performance and battery life"
    echo ""
    echo "📱 TEST THE FIX:"
    echo "   1. Open http://localhost:3000"
    echo "   2. Navigate to Wallet tab"
    echo "   3. Check browser network tab (F12 > Network)"
    echo "   4. Should see only initial API calls, not continuous ones"
    echo "   5. Console should be much quieter"
    echo ""
else
    echo "❌ Frontend not responding yet"
fi

echo "Press Ctrl+C to stop"
wait
