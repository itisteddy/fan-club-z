#!/bin/bash

# Production Deployment Script
# This script ensures we're deploying from the main branch

echo "🚀 Starting Production Deployment..."

# Check if we're on the main branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
    echo "❌ ERROR: You must be on the main branch to deploy to production!"
    echo "Current branch: $CURRENT_BRANCH"
    echo "Please run: git checkout main"
    exit 1
fi

echo "✅ Confirmed: Currently on main branch"

# Pull latest changes from remote main branch
echo "📥 Pulling latest changes from main branch..."
git pull origin main

# Check for any uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
    echo "⚠️  WARNING: You have uncommitted changes!"
    echo "Please commit or stash your changes before deploying."
    git status --short
    exit 1
fi

echo "✅ No uncommitted changes found"

# Deploy to production environment
echo "🚀 Deploying to production environment..."
vercel --prod --yes

echo "✅ Production deployment completed!"
echo "🌐 Your production deployment should be available shortly."
echo "�� Check the Vercel dashboard for the deployment URL."
