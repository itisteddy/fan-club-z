#!/bin/bash

# Fan Club Z - Deploy WebSocket Dev Fix
# This script deploys the WebSocket configuration fixes for development environment

set -e

echo "🚀 Fan Club Z - Deploying WebSocket Dev Environment Fix"
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
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

# Verify we're on the correct branch for dev deployment
current_branch=$(git branch --show-current)
print_status "Current branch: $current_branch"

if [ "$current_branch" != "development" ]; then
    print_warning "Not on development branch. Switching to development..."
    git checkout development
    if [ $? -ne 0 ]; then
        print_error "Failed to switch to development branch"
        exit 1
    fi
fi

# Check if there are uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
    print_status "Uncommitted changes detected. Committing WebSocket fixes..."
    
    # Add all changes
    git add .
    
    # Commit with descriptive message
    git commit -m "fix: WebSocket configuration for separate dev/prod Render services

- Update environment.ts to use fanclubz-dev.onrender.com for dev
- Update environment.ts to use fanclubz-prod.onrender.com for production  
- Fix CORS configuration in server to include both dev and prod URLs
- Add service name detection for proper URL logging
- This resolves WebSocket connection errors in development deployment"
    
    print_success "Changes committed successfully"
fi

# Push to development branch to trigger Render deployment
print_status "Pushing to development branch to trigger Render deployment..."
git push origin development

if [ $? -ne 0 ]; then
    print_error "Failed to push to development branch"
    exit 1
fi

print_success "Successfully pushed to development branch"

# Wait a moment for Render to pick up the deployment
print_status "Waiting for Render to detect changes..."
sleep 5

# Display deployment information
print_status "Deployment Information:"
echo "=================================="
echo "🔧 Development Service: fanclubz-dev"
echo "🌐 Dev URL: https://fanclubz-dev.onrender.com"
echo "🌍 Frontend URL: https://dev.fanclubz.app"
echo "💬 WebSocket URL: https://fanclubz-dev.onrender.com"
echo ""
echo "🔧 Production Service: fanclubz-prod"  
echo "🌐 Prod URL: https://fanclubz-prod.onrender.com"
echo "🌍 Frontend URL: https://app.fanclubz.app"
echo "💬 WebSocket URL: https://fanclubz-prod.onrender.com"

print_status "Key Changes Made:"
echo "=================="
echo "✅ Fixed environment detection to use separate dev/prod server URLs"
echo "✅ Updated CORS configuration for both services"
echo "✅ Added service name detection in server logs"
echo "✅ WebSocket now connects to correct service based on environment"

print_status "Monitoring Deployment:"
echo "======================"
echo "🔍 Check Render dashboard: https://dashboard.render.com/"
echo "🔍 Dev service deployment: fanclubz-dev"
echo "🏥 Health check: https://fanclubz-dev.onrender.com/health"
echo "🧪 Test WebSocket: https://fanclubz-dev.onrender.com/ws"

print_warning "Note: Render deployments can take 5-10 minutes to complete"
print_status "You can monitor the deployment status in the Render dashboard"

# Test connection after deployment (optional)
read -p "Do you want to test the connection after deployment? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_status "Waiting 2 minutes for deployment to complete..."
    sleep 120
    
    print_status "Testing dev server health..."
    if curl -f https://fanclubz-dev.onrender.com/health > /dev/null 2>&1; then
        print_success "Dev server is responding!"
    else
        print_warning "Dev server not yet responding, may still be deploying"
    fi
    
    print_status "Testing WebSocket endpoint..."
    if curl -f https://fanclubz-dev.onrender.com/ws > /dev/null 2>&1; then
        print_success "WebSocket endpoint is available!"
    else
        print_warning "WebSocket endpoint not yet available"
    fi
fi

print_success "WebSocket Dev Fix deployment initiated!"
print_status "Next steps:"
echo "1. Monitor deployment in Render dashboard"
echo "2. Test WebSocket connection at https://dev.fanclubz.app"
echo "3. Check browser console for connection logs"
echo "4. Verify no CORS errors in network tab"

echo ""
print_success "Deployment script completed successfully! 🎉"
