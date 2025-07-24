#!/bin/bash

echo "🔧 Fixing Fan Club Z App Issues..."

# Navigate to client directory
cd "client" || exit 1

echo "📦 Cleaning node_modules and package-lock..."
rm -rf node_modules
rm -f package-lock.json

echo "📥 Installing dependencies..."
npm install

echo "🧹 Clearing Vite cache..."
npx vite --clearCache

echo "✅ Fixes applied! Try starting the dev server now:"
echo "   cd client && npm run dev"
