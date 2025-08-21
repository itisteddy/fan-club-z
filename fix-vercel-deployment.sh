#!/bin/bash

# Fix Vercel Deployment Script
# This script addresses the build failures by ensuring all dependencies are properly configured

set -e  # Exit on any error

echo "🔧 Fan Club Z - Fixing Vercel Deployment Issues"
echo "=============================================="

# Navigate to the project root
cd "$(dirname "$0")"

echo "📍 Current directory: $(pwd)"

# Step 1: Clean and reinstall all dependencies
echo ""
echo "Step 1: Cleaning and reinstalling dependencies..."
echo "------------------------------------------------"

# Remove all node_modules and package-lock files
echo "🧹 Cleaning up old dependencies..."
rm -rf node_modules
rm -rf client/node_modules
rm -rf server/node_modules
rm -rf shared/node_modules
rm -f package-lock.json
rm -f client/package-lock.json
rm -f server/package-lock.json
rm -f shared/package-lock.json

# Install all dependencies from root (this will handle workspaces)
echo "📦 Installing all dependencies..."
npm install

# Step 2: Verify dependency resolution
echo ""
echo "Step 2: Verifying dependency resolution..."
echo "----------------------------------------"

# Check if vite is available in client workspace
if ! npm ls vite --workspace=@fanclubz/client > /dev/null 2>&1; then
    echo "❌ Vite not found in client workspace"
    echo "Installing vite directly in client workspace..."
    cd client
    npm install vite@^4.4.9 @vitejs/plugin-react@^4.1.1 typescript@^5.3.3 --save-dev
    cd ..
else
    echo "✅ Vite found in client workspace"
fi

# Step 3: Build shared package first
echo ""
echo "Step 3: Building shared package..."
echo "--------------------------------"

cd shared
echo "🔨 Building shared package..."
npm run build
cd ..

# Step 4: Test client build
echo ""
echo "Step 4: Testing client build..."
echo "------------------------------"

cd client
echo "🔨 Testing client build..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Client build successful!"
else
    echo "❌ Client build failed!"
    exit 1
fi

cd ..

# Step 5: Verify all workspace packages
echo ""
echo "Step 5: Verifying workspace packages..."
echo "--------------------------------------"

echo "📋 Listing all workspace packages:"
npm ls --workspaces --depth=0

# Step 6: Test the exact vercel build command
echo ""
echo "Step 6: Testing Vercel build command..."
echo "-------------------------------------"

echo "🔨 Running the exact Vercel build command..."
npm run build:shared && npm run build:client

if [ $? -eq 0 ]; then
    echo "✅ Vercel build command successful!"
else
    echo "❌ Vercel build command failed!"
    exit 1
fi

# Step 7: Verify output directory
echo ""
echo "Step 7: Verifying output..."
echo "-------------------------"

if [ -d "client/dist" ]; then
    echo "✅ Client dist directory exists"
    echo "📁 Contents of client/dist:"
    ls -la client/dist/
else
    echo "❌ Client dist directory not found"
    exit 1
fi

# Step 8: Git operations
echo ""
echo "Step 8: Committing fixes..."
echo "-------------------------"

echo "📝 Adding changes to git..."
git add .

echo "💾 Committing changes..."
git commit -m "fix: resolve Vercel deployment issues - add missing Vite dependencies to client workspace

- Add vite, @vitejs/plugin-react, and typescript to client devDependencies
- Update Vercel build command to build shared package first
- Ensure proper workspace dependency resolution
- Fix build order: shared -> client
- Version: 2.0.55"

echo "🚀 Pushing changes..."
git push origin main

echo ""
echo "🎉 Deployment fix completed successfully!"
echo "========================================"
echo ""
echo "✅ All dependencies are properly configured"
echo "✅ Build process verified locally"
echo "✅ Changes committed and pushed to main branch"
echo ""
echo "🔄 Vercel should now automatically redeploy with the fixes"
echo "📍 Monitor the deployment at: https://vercel.com/dashboard"
echo ""
echo "If issues persist, check the deployment logs for any remaining errors."
