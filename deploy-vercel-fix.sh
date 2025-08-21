#!/bin/bash

# Fan Club Z - Fix Vercel Deployment Script
# This script fixes the "vite: command not found" error

set -e

echo "🔧 Fixing Vercel deployment issues..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Run this script from the monorepo root directory"
    exit 1
fi

echo "✅ Root directory confirmed"

# Clean existing node_modules and lock files
echo "🧹 Cleaning existing installations..."
rm -rf node_modules package-lock.json client/node_modules client/package-lock.json server/node_modules server/package-lock.json shared/node_modules shared/package-lock.json

# Install dependencies using npm workspaces
echo "📦 Installing dependencies with npm workspaces..."
npm install

# Verify Vite is accessible
echo "🔍 Verifying Vite installation..."
if npm list vite --depth=0 > /dev/null 2>&1; then
    echo "✅ Vite found in root dependencies"
else
    echo "❌ Vite not found in root dependencies"
    exit 1
fi

# Test workspace build command
echo "🏗️ Testing build command..."
if npm run build:client; then
    echo "✅ Build command successful"
else
    echo "❌ Build command failed"
    exit 1
fi

# Verify build output
if [ -d "client/dist" ]; then
    echo "✅ Build output directory exists"
    echo "📄 Build files:"
    ls -la client/dist/
else
    echo "❌ Build output directory not found"
    exit 1
fi

echo "🎉 All fixes applied successfully!"
echo "🚀 Ready for Vercel deployment"

# Optional: Commit the changes
read -p "Commit these changes? (y/n): " -r
if [[ $REPLY =~ ^[Yy]$ ]]; then
    git add .
    git commit -m "fix: resolve Vercel 'vite: command not found' deployment error

- Move Vite and related build tools to root devDependencies for proper hoisting
- Update workspace scripts to use npm workspace commands
- Optimize Vercel configuration for monorepo deployment
- Add .npmrc with workspace-specific settings
- Clean client package.json devDependencies to avoid conflicts"
    
    echo "✅ Changes committed"
    echo "🔄 Push to trigger new deployment: git push origin main"
fi
