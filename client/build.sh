#!/bin/bash
set -e

echo "🔧 Setting up Node.js environment..."
export NODE_VERSION=18.19.0

echo "🧹 Cleaning previous installation..."
rm -rf node_modules package-lock.json

echo "📦 Installing dependencies with legacy peer deps..."
npm install --legacy-peer-deps --no-optional

echo "🔍 Verifying Vite installation..."
ls -la node_modules/.bin/vite || echo "Vite not found in .bin"
ls -la node_modules/vite || echo "Vite package not found"

echo "🏗️ Building application..."
npx vite build

echo "✅ Build completed successfully!"
