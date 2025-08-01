#!/bin/bash

# Fan Club Z - Quick Git Commit and Deploy Script

echo "🚀 Fan Club Z - Deploying Latest Changes"
echo "========================================"

# Add all changes
echo "📝 Adding all changes..."
git add .

# Commit with timestamp
echo "💾 Committing changes..."
git commit -m "fix: resolve Vercel deployment issues - update build scripts and configuration"

# Push to main branch
echo "📤 Pushing to GitHub..."
git push origin main

# Show current status
echo "✅ Git Status:"
git status

echo ""
echo "🎯 Deployment should now work with updated build configuration!"
echo "💡 Check Vercel dashboard for build progress"
