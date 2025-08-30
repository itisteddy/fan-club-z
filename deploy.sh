#!/bin/bash

# Fan Club Z Landing Page Deployment Script
echo "🚀 Fan Club Z Landing Page Deployment"
echo "====================================="

# Check if we're in the right directory
if [ ! -f "index.html" ]; then
    echo "❌ Error: index.html not found. Make sure you're in the landing-page directory."
    exit 1
fi

# Check for uncommitted changes
if [ -n "$(git status --porcelain 2>/dev/null)" ]; then
    echo "⚠️  You have uncommitted changes:"
    git status --short
    read -p "Continue with deployment? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Deployment cancelled"
        exit 1
    fi
fi

# Deploy to Vercel
echo "📤 Deploying to Vercel..."
if vercel --prod --yes; then
    echo "✅ Deployment successful!"
    echo ""
    echo "🌐 Your landing page is live at:"
    echo "   https://fanclubz-landing.vercel.app"
    echo ""
    echo "🔗 To set up custom domain (fanclubz.app):"
    echo "   1. Go to Vercel dashboard"
    echo "   2. Select fanclubz-landing project"
    echo "   3. Go to Settings → Domains"
    echo "   4. Add: fanclubz.app"
    echo ""
    echo "📊 Monitor deployment at:"
    echo "   https://vercel.com/dashboard"
else
    echo "❌ Deployment failed"
    exit 1
fi 