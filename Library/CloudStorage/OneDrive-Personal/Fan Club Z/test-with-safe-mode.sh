#!/bin/bash

echo "🔧 Complete Unicode Fix & Test Script"
echo "====================================="

cd "client" || exit 1

echo "1. 📋 Backing up current main.tsx..."
cp src/main.tsx src/main-original.tsx

echo ""
echo "2. 🔄 Switching to safe main.tsx..."
cp src/main-safe.tsx src/main.tsx

echo ""
echo "3. 🧹 Cleaning all caches..."
rm -rf node_modules/.vite
rm -rf dist
rm -rf tsconfig.tsbuildinfo
rm -rf tsconfig.node.tsbuildinfo

echo ""
echo "4. ✅ Files fixed:"
echo "   • App.tsx (Unicode escapes)"
echo "   • useWalletInitialization.tsx (Unicode escapes)"
echo "   • main.tsx (Safe fallback version)"

echo ""
echo "5. 🚀 Starting development server with safe mode..."
echo ""
echo "📱 Test these URLs in order:"
echo "   1. 🧪 Server test: http://172.20.3.192:3000/server-test.html"
echo "   2. 🔬 Minimal app:  http://172.20.3.192:3000/?minimal"
echo "   3. 🏠 Main app:     http://172.20.3.192:3000"
echo ""
echo "💡 If minimal works but main app fails, we'll know which components have issues"
echo "Press Ctrl+C to stop"
echo "====================================="

npm run dev
