#!/bin/bash
set -e

echo "🔧 Setting up Node.js environment..."
export NODE_VERSION=18.19.0

echo "🧹 Cleaning previous installation..."
rm -rf node_modules package-lock.json

echo "📦 Installing dependencies with legacy peer deps..."
npm install --legacy-peer-deps --no-optional

echo "🏗️ Building application..."
npm run build

echo "✅ Build completed successfully!"
