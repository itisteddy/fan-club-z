#!/bin/bash
# Nuclear cache clear - forces complete rebuild

echo "🔥 NUCLEAR CACHE CLEAR - This will force a complete rebuild"
echo ""

# Navigate to client directory
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR/client" || exit 1

echo "1️⃣  Stopping all Node processes..."
pkill -f "node" || true
pkill -f "vite" || true
sleep 2

echo "2️⃣  Removing ALL cache directories..."
rm -rf node_modules/.vite
rm -rf node_modules/.cache
rm -rf .vite
rm -rf dist
rm -rf build

echo "3️⃣  Clearing npm cache..."
npm cache clean --force

echo "4️⃣  Reinstalling dependencies (this may take a minute)..."
npm install

echo ""
echo "✅ Cache cleared successfully!"
echo ""
echo "═══════════════════════════════════════════════════"
echo "NEXT STEPS:"
echo "═══════════════════════════════════════════════════"
echo "1. Start dev server: npm run dev"
echo "2. In your browser:"
echo "   - Press F12 (open DevTools)"
echo "   - Console tab → type: localStorage.clear(); sessionStorage.clear()"
echo "   - Application tab → click 'Clear site data'"
echo "   - Press Ctrl+Shift+R (Cmd+Shift+R on Mac) to hard refresh"
echo "3. You MUST see this in console:"
echo "   ═══════════════════════════════════════"
echo "   🔍 OAUTH REDIRECT DIAGNOSTIC"
echo "   ═══════════════════════════════════════"
echo ""
echo "If you don't see the diagnostic, the cache is still there."
echo "═══════════════════════════════════════════════════"
