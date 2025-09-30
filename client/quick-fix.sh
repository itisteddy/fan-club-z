#!/bin/bash

echo "🔧 Quick Fix Script for Fan Club Z"
echo "=================================="
echo ""

# Kill any running dev servers
echo "🛑 Stopping any running dev servers..."
pkill -f "vite" 2>/dev/null || true
pkill -f "npm run dev" 2>/dev/null || true

# Wait a moment
sleep 2

# Clear all caches
echo "🧹 Clearing caches..."
rm -rf dist
rm -rf .vite
rm -rf node_modules/.vite
rm -rf ../.vite

# Clear browser storage instruction
echo ""
echo "⚠️  IMPORTANT: Clear your browser cache!"
echo "   1. Open DevTools (F12)"
echo "   2. Right-click the refresh button"
echo "   3. Select 'Empty Cache and Hard Reload'"
echo ""
echo "   OR"
echo ""
echo "   1. Open DevTools (F12)"
echo "   2. Go to Application tab"
echo "   3. Clear Storage -> Clear site data"
echo ""

# Rebuild
echo "🏗️  Rebuilding..."
npm run build

echo ""
echo "✅ Done! Now run: npm run dev"
echo ""
echo "📝 If changes still don't appear:"
echo "   1. Stop the dev server (Ctrl+C)"
echo "   2. Clear browser cache (see above)"  
echo "   3. Run: npm run dev"
echo "   4. Hard refresh the browser (Cmd+Shift+R or Ctrl+Shift+R)"
