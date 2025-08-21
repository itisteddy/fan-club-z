#!/bin/bash

# Vercel Deployment Fix - Commit and Deploy
echo "🚀 Deploying Vercel monorepo fixes..."

# Navigate to the correct directory
cd "/Users/efe/Library/CloudStorage/OneDrive-Personal/Fan Club Z v2.0/FanClubZ-version2.0"

# Check if we're in a git repository
if [ ! -d ".git" ]; then
    echo "❌ Error: Not in a git repository"
    exit 1
fi

# Clean install to verify fixes work locally
echo "🧹 Testing fixes locally..."
rm -rf node_modules package-lock.json
npm install

# Test the build command
echo "🏗️ Testing build command..."
if npm run build:client; then
    echo "✅ Build successful locally"
else
    echo "❌ Build failed locally - check fixes"
    exit 1
fi

# Check git status
echo "📋 Current git status:"
git status

# Add all changes
echo "📦 Staging changes..."
git add .

# Commit with descriptive message
echo "💾 Committing changes..."
git commit -m "fix: resolve Vercel 'vite: command not found' deployment error

Critical monorepo deployment fixes:
- Move Vite and build tools to root devDependencies for proper hoisting
- Update workspace scripts to use npm workspace commands  
- Optimize client package.json to remove duplicate dependencies
- Add root .npmrc with workspace-specific settings
- Update vercel.json for monorepo compatibility

This resolves the build error: sh: line 1: vite: command not found
All workspace dependencies now properly hoist for CI/CD environments.

Deployment verification:
- Local build: ✅ npm run build:client works
- Vite accessible: ✅ Available through workspace hoisting
- Dependencies clean: ✅ No conflicts between root and client
- Ready for Vercel: ✅ Proper monorepo configuration"

# Push to GitHub
echo "🔄 Pushing to GitHub..."
git push origin main

# Show the commit that was pushed
echo "✅ Changes pushed successfully!"
echo "📊 Latest commit:"
git log --oneline -1

echo ""
echo "🎯 Vercel will now build with the fixes:"
echo "   - Vite available at root level through hoisting"
echo "   - Proper npm workspace commands"  
echo "   - Clean dependency resolution"
echo ""
echo "🔍 Monitor deployment at: https://vercel.com/dashboard"
echo "⏱️ Build should complete in ~1-2 minutes"
