#!/bin/bash

# Development Deployment Script
# This script ensures we're deploying from the development branch

echo "🚀 Starting Development Deployment..."

# Check if we're on the development branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "development" ]; then
    echo "❌ ERROR: You must be on the development branch to deploy to dev!"
    echo "Current branch: $CURRENT_BRANCH"
    echo "Please run: git checkout development"
    exit 1
fi

echo "✅ Confirmed: Currently on development branch"

# Pull latest changes from remote development branch
echo "📥 Pulling latest changes from development branch..."
git pull origin development

# Check for any uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
    echo "⚠️  WARNING: You have uncommitted changes!"
    echo "Please commit or stash your changes before deploying."
    git status --short
    exit 1
fi

echo "✅ No uncommitted changes found"

# Deploy to development environment
echo "🚀 Deploying to development environment..."
vercel --yes

echo "✅ Development deployment completed!"
echo "🌐 Your development deployment should be available shortly."
echo "📋 Check the Vercel dashboard for the deployment URL."