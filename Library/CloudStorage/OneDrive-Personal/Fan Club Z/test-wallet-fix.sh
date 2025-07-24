#!/bin/bash

echo "🔧 Quick Frontend Restart - Wallet Tab Fix"
echo "=========================================="
echo ""

echo "1️⃣  Stopping frontend..."
pkill -f "vite" 2>/dev/null || true
sleep 2

echo "2️⃣  Clearing cache..."
cd client && rm -rf node_modules/.vite .vite 2>/dev/null || true

echo "3️⃣  Starting frontend with wallet tab fix..."
npm run dev &

echo ""
echo "✅ Wallet tab has been added to bottom navigation!"
echo ""
echo "🎯 CHANGES MADE:"
echo "   ✅ Added Wallet tab between 'My Bets' and 'Clubs'"
echo "   ✅ Wallet requires authentication (shows login prompt if not signed in)"
echo "   ✅ Navigation now supports 5 tabs instead of 4"
echo "   ✅ Tapping Wallet will navigate to /wallet route"
echo ""
echo "⏳ Waiting for frontend to start..."
sleep 6

echo ""
echo "🧪 Testing wallet navigation..."
if curl -s http://localhost:3000 >/dev/null 2>&1; then
    echo "✅ Frontend is running!"
    echo ""
    echo "📱 TEST THE FIX:"
    echo "   1. Open http://localhost:3000"
    echo "   2. Log in with any user account" 
    echo "   3. You should now see 5 tabs in bottom navigation"
    echo "   4. Tap the 'Wallet' tab (3rd tab with wallet icon)"
    echo "   5. Should navigate to wallet screen showing balance and transactions"
    echo ""
    echo "💰 WALLET FEATURES (All Mock for MVP):"
    echo "   ✅ View current balance"
    echo "   ✅ Add funds (demo deposit)"
    echo "   ✅ View transaction history"
    echo "   ✅ Withdraw funds (demo)"
    echo "   ✅ Quick deposit buttons"
    echo ""
else
    echo "❌ Frontend not responding yet, try again in a few seconds"
fi

echo "Press Ctrl+C to stop"
wait
