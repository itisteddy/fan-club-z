#!/bin/bash
set -e

echo "🔧 Setting up Vercel build environment..."

# Navigate to client directory
cd client

echo "📦 Installing client dependencies..."
npm install --legacy-peer-deps

echo "🏗️ Building application..."
npm run build

echo "✅ Build completed successfully!"
