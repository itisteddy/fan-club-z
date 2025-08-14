#!/bin/bash

# Fan Club Z - Single Service WebSocket Fix (Free Tier)
# This script fixes WebSocket configuration for single Render service

set -e

echo "🚀 Fan Club Z - Single Service WebSocket Fix"
echo "============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_status "Configuration for Single Render Service (Free Tier)"
echo ""

# Check if we have uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
    print_status "Committing WebSocket fixes for single service..."
    
    git add .
    git commit -m "fix: WebSocket configuration for single Render service (free tier)

- Updated environment.ts to use single fan-club-z.onrender.com service
- Both dev.fanclubz.app and app.fanclubz.app connect to same service
- Fixed CORS configuration for single service deployment
- Added proper logging for single service setup
- Resolves WebSocket connection issues on free tier"
    
    print_success "Changes committed successfully"
fi

print_status "Required Render Environment Variables:"
echo "========================================"
echo ""
echo "Go to Render Dashboard → Your Service → Environment and set:"
echo ""
echo "✅ CLIENT_URL=https://app.fanclubz.app"
echo "✅ FRONTEND_URL=https://app.fanclubz.app"
echo "✅ CORS_ORIGINS=https://dev.fanclubz.app,https://app.fanclubz.app,https://fanclubz.app,https://www.fanclubz.app,https://fan-club-z.onrender.com"
echo "✅ WEBSOCKET_ORIGINS=https://dev.fanclubz.app,https://app.fanclubz.app,https://fanclubz.app,https://fan-club-z.onrender.com"
echo ""

print_warning "CRITICAL: You MUST update these environment variables in Render before deploying!"
echo ""

read -p "Have you updated the environment variables in Render Dashboard? (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_error "Please update environment variables first:"
    echo "1. Go to https://dashboard.render.com/"
    echo "2. Select your service"
    echo "3. Go to Environment tab"
    echo "4. Update the variables shown above"
    echo "5. Run this script again"
    exit 1
fi

print_success "Environment variables confirmed!"

# Deploy to main branch
current_branch=$(git branch --show-current)
if [ "$current_branch" != "main" ]; then
    print_status "Switching to main branch for deployment..."
    git checkout main
    git merge development
fi

print_status "Pushing to main branch to trigger Render deployment..."
git push origin main

print_success "Deployment initiated!"

print_status "Single Service Configuration:"
echo "=============================="
echo "🌐 Service URL: https://fan-club-z.onrender.com"
echo "🔧 Dev Frontend: https://dev.fanclubz.app → fan-club-z.onrender.com"
echo "🔧 Prod Frontend: https://app.fanclubz.app → fan-club-z.onrender.com"
echo "💬 WebSocket: Single service handles both environments"
echo ""

print_status "Key Changes Made:"
echo "=================="
echo "✅ Both dev and prod frontends connect to same service"
echo "✅ Single CORS configuration handles all domains"
echo "✅ Simplified service setup for free tier"
echo "✅ Unified WebSocket connections"

print_status "Testing URLs:"
echo "============="
echo "🏥 Health Check: https://fan-club-z.onrender.com/health"
echo "🧪 WebSocket Test: https://fan-club-z.onrender.com/ws"
echo "🌍 Dev Frontend: https://dev.fanclubz.app"
echo "🌍 Prod Frontend: https://app.fanclubz.app"

print_warning "Note: Render free tier deployments can take 5-10 minutes"

# Optional connection test
read -p "Test connection after deployment? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_status "Waiting 2 minutes for deployment..."
    sleep 120
    
    print_status "Testing service health..."
    if curl -f https://fan-club-z.onrender.com/health > /dev/null 2>&1; then
        print_success "Service is responding!"
        
        # Test both frontend connections
        print_status "Testing WebSocket endpoint..."
        if curl -f https://fan-club-z.onrender.com/ws > /dev/null 2>&1; then
            print_success "WebSocket endpoint is available!"
        else
            print_warning "WebSocket endpoint not yet ready"
        fi
    else
        print_warning "Service not yet responding, may still be deploying"
    fi
fi

print_success "Single Service WebSocket Fix completed! 🎉"
echo ""
print_status "Next Steps:"
echo "1. Monitor deployment in Render dashboard"
echo "2. Test both https://dev.fanclubz.app and https://app.fanclubz.app"
echo "3. Check browser console for successful WebSocket connections"
echo "4. Verify no CORS errors in both environments"

echo ""
print_success "Both dev and prod should now connect to the same service successfully!"
