#!/bin/bash

# Quick Deployment Fix Script
set -e

echo "🚀 Fan Club Z - Quick Deployment Fix"
echo "==================================="

# Navigate to the correct directory
cd "$(dirname "$0")"

echo "📍 Working directory: $(pwd)"

# Make scripts executable
chmod +x make-fix-executable.sh
chmod +x fix-vercel-deployment.sh

echo "✅ All fixes have been implemented:"
echo "   - Added Vite dependencies to client package.json"
echo "   - Updated Vercel build command to build shared first"
echo "   - Configured proper workspace dependencies"

echo ""
echo "📝 Committing changes..."
git add .
git commit -m "fix: resolve Vercel deployment - add missing Vite dependencies

- Add vite, @vitejs/plugin-react, typescript to client devDependencies  
- Update Vercel buildCommand to build shared package first
- Ensure proper npm workspace dependency resolution
- Fix: 'vite: command not found' error in deployment
- Version: 2.0.55"

echo ""
echo "🚀 Pushing to main branch..."
git push origin main

echo ""
echo "🎉 Deployment fix completed!"
echo "✅ Changes pushed to main branch"
echo "🔄 Vercel will automatically redeploy"
echo ""
echo "Monitor deployment at: https://vercel.com/dashboard"

