#!/bin/bash

echo "🚨 CRITICAL BALANCE BUG FIX"
echo "=========================="
echo ""

echo "🔍 ISSUE IDENTIFIED:"
echo "   ❌ Balance resets when navigating between screens"
echo "   ❌ Wallet re-initializes on every navigation"
echo "   ❌ API calls override existing balance with 0"
echo "   ❌ State not properly preserved between screens"
echo ""

echo "✅ FIXES APPLIED:"
echo "   1. useWalletInitialization: Removed function from deps array"
echo "   2. initializeWallet: Preserves existing balance, doesn't reset"
echo "   3. refreshBalance: Won't override existing balance with 0"
echo "   4. Added proper state persistence between navigation"
echo ""

echo "1️⃣  Stopping frontend to apply balance fixes..."
pkill -f "vite" 2>/dev/null || true
sleep 2

echo "2️⃣  Clearing all caches..."
cd client
rm -rf node_modules/.vite .vite dist 2>/dev/null || true

echo "3️⃣  Starting frontend with balance preservation..."
npm run dev &

echo ""
echo "⏳ Waiting for frontend to start..."
sleep 6

echo ""
if curl -s http://localhost:3000 >/dev/null 2>&1; then
    echo "✅ Frontend is running with balance fixes!"
    echo ""
    echo "🧪 TEST BALANCE PERSISTENCE:"
    echo ""
    echo "   1. Open http://localhost:3000 and login"
    echo "   2. Go to Wallet tab - should show balance (e.g. \$500)"
    echo "   3. Add \$50 using 'Add Funds' - balance becomes \$550"
    echo "   4. Navigate to Discover tab, then back to Wallet"
    echo "   5. ✅ Balance should STILL be \$550 (not reset to \$50)"
    echo ""
    echo "📊 EXPECTED BEHAVIOR:"
    echo "   ✅ Balance persists between screen navigation"
    echo "   ✅ No wallet re-initialization on navigation"
    echo "   ✅ Transactions and balance stay consistent"
    echo "   ✅ Much fewer console logs"
    echo ""
    echo "🚫 WHAT SHOULD NOT HAPPEN:"
    echo "   ❌ Balance resetting when navigating"
    echo "   ❌ 'Initializing wallet for user' on every screen change"
    echo "   ❌ Balance jumping between values"
    echo ""
else
    echo "❌ Frontend not responding yet, wait a few more seconds"
fi

echo ""
echo "🔍 Watch console for:"
echo "   - '[WALLET] Already initialized with balance: X' (good!)"
echo "   - '[WALLET] Preserving existing balance: X' (good!)"
echo "   - Much fewer wallet-related logs overall"
echo ""
echo "Press Ctrl+C to stop"
wait
