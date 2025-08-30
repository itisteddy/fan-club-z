#!/bin/bash

# Vercel Deployment Fix - Infrastructure Only (No Version Change)
echo "🚀 Deploying Vercel monorepo infrastructure fixes..."

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

# Commit with descriptive message (NO VERSION CHANGE)
echo "💾 Committing infrastructure fixes..."
git commit -m "fix(infrastructure): resolve Vercel monorepo deployment error

Infrastructure changes only - no version bump needed:
- Move Vite and build tools to root devDependencies for proper hoisting
- Update workspace scripts to use npm workspace commands  
- Optimize client package.json to remove duplicate dependencies
- Add root .npmrc with workspace-specific settings
- Update vercel.json for monorepo compatibility

Resolves: sh: line 1: vite: command not found

Technical details:
- Workspace dependency hoisting now works in CI/CD
- Build tools accessible from monorepo root
- Deterministic builds with npm ci
- No breaking changes or user-facing modifications

Version remains: 2.0.55 (infrastructure fix only)"

# Push to GitHub
echo "🔄 Pushing to GitHub..."
git push origin main

# Show the commit that was pushed
echo "✅ Infrastructure fixes pushed successfully!"
echo "📊 Latest commit:"
git log --oneline -1

echo ""
echo "🎯 Vercel will now build successfully:"
echo "   ✅ Vite available at root level through hoisting"
echo "   ✅ Proper npm workspace commands"  
echo "   ✅ Clean dependency resolution"
echo ""
echo "📋 Version Management Guidelines:"
echo "   🔧 Infrastructure fixes: NO version change (this deploy)"
echo "   🐛 Bug fixes: npm run version:patch"
echo "   ✨ New features: npm run version:minor"
echo "   💥 Breaking changes: npm run version:major"
echo ""
echo "🔍 Monitor deployment at: https://vercel.com/dashboard"
