#!/bin/bash

echo "🧹 Cleaning build artifacts..."

# Remove build directories
rm -rf dist
rm -rf .vite
rm -rf node_modules/.vite

# Clear npm cache
echo "🧹 Clearing npm cache..."
npm cache clean --force

echo "📦 Reinstalling dependencies..."
npm install

echo "🏗️ Building fresh..."
npm run build

echo "✅ Rebuild complete! Now run: npm run dev"
