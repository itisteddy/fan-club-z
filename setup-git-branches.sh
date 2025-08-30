#!/bin/bash

echo "🔧 Setting up Fan Club Z Git branches for deployment..."

# Check current status
echo "📊 Current Git status:"
git status --short
echo ""
git branch -a
echo ""

# Save current work if any
if ! git diff --quiet; then
    echo "💾 Saving current work..."
    git add .
    git commit -m "Save work before branch setup - $(date '+%Y-%m-%d %H:%M')"
fi

# Ensure we're on development branch
echo "🔄 Ensuring we're on development branch..."
git checkout development || git checkout -b development

# Create main branch (for production)
echo "🎯 Creating main branch for production..."
git checkout -b main 2>/dev/null || git checkout main
git merge development --no-edit
git push -u origin main

# Create staging branch (for testing)
echo "🧪 Creating staging branch for testing..."
git checkout -b staging 2>/dev/null || git checkout staging
git merge development --no-edit
git push -u origin staging

# Return to development
echo "🛠️ Returning to development branch..."
git checkout development
git push -u origin development

echo ""
echo "✅ Git branches set up successfully!"
echo ""
echo "📋 Branch structure:"
echo "   📱 development → Active development work"
echo "   🧪 staging     → Testing environment"  
echo "   🎯 main        → Production (fanclubz.app)"
echo ""
echo "🎉 Ready for Vercel configuration!"