#!/bin/bash
# Complete clean restart for development environment

echo "🧹 Stopping any running dev servers..."
pkill -f "vite" || true

echo "🗑️  Clearing Vite cache..."
rm -rf client/node_modules/.vite
rm -rf client/.vite

echo "🗑️  Clearing browser storage (you'll need to do this manually in DevTools)..."
echo "   1. Open DevTools (F12)"
echo "   2. Go to Application tab"
echo "   3. Click 'Clear site data'"

echo "✅ Clean complete! Now start your dev server:"
echo "   cd client && npm run dev"
