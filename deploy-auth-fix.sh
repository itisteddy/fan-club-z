#!/bin/bash

# Fan Club Z - Authentication Fix Deployment Script
# This script fixes authentication issues and deploys to production

set -e  # Exit on any error

echo "🚀 Fan Club Z Authentication Fix Deployment"
echo "==========================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Not in the project root directory. Please run this script from the Fan Club Z project root."
    exit 1
fi

# Check Git status
echo "📋 Checking Git status..."
if [ -n "$(git status --porcelain)" ]; then
    echo "⚠️  Warning: You have uncommitted changes."
    echo "📄 Current changes:"
    git status --short
    echo ""
    read -p "Continue with deployment? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Deployment cancelled."
        exit 1
    fi
fi

# Update version for tracking
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
echo "🏷️  Creating deployment tag: auth_fix_${TIMESTAMP}"

# Stage all authentication-related files  
echo "📦 Staging authentication fixes..."
git add -A

# Commit the changes
echo "💾 Committing authentication fixes..."
git commit -m "🔐 Fix authentication flow - resolve login/registration issues

- Fix registration flow to properly authenticate users after signup
- Improve error handling and user feedback in auth store
- Update AuthPage with better UX and test mode
- Ensure proper session management and token handling
- Add proper state management for authenticated/unauthenticated states

Deployment: auth_fix_${TIMESTAMP}"

# Create a tag for this deployment
git tag "auth_fix_${TIMESTAMP}" -m "Authentication fixes deployment - ${TIMESTAMP}"

# Push to main branch
echo "⬆️  Pushing to main branch..."
git push origin main

# Push tags
echo "🏷️  Pushing tags..."
git push origin --tags

# Check if we need to build
echo "🔨 Building project..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed! Please fix the build errors before deploying."
    exit 1
fi

echo ""
echo "✅ Authentication fixes have been successfully deployed!"
echo ""
echo "📊 Deployment Summary:"
echo "   • Fixed registration flow authentication"
echo "   • Improved error handling and user feedback"  
echo "   • Enhanced AuthPage UX with test mode"
echo "   • Better session and token management"
echo "   • Tag: auth_fix_${TIMESTAMP}"
echo ""
echo "🌐 Your changes should be live on:"
echo "   • Frontend: https://fan-club-z.vercel.app"
echo "   • Backend: https://fan-club-z-backend.onrender.com"
echo ""
echo "🔍 To verify the fix:"
echo "   1. Visit the app and try registering a new user"
echo "   2. Check that users are automatically logged in after registration"
echo "   3. Test login functionality with existing users"
echo "   4. Use the Test Mode panel for quick testing"
echo ""
echo "🐛 If issues persist, check:"
echo "   • Supabase authentication settings"
echo "   • Environment variables are properly set"
echo "   • Browser console for any errors"
echo ""
echo "✨ Happy predicting!"