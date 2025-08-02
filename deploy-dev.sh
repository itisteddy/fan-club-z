#!/bin/bash

# Fan Club Z - Development Deployment Script
# Quick deployment for development environment

set -e

echo "🛠️  Fan Club Z - Development Deployment"
echo "======================================="

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Not in Fan Club Z project directory"
    exit 1
fi

# Check current branch
current_branch=$(git branch --show-current)
if [ "$current_branch" != "development" ]; then
    print_warning "You're not on the development branch (current: $current_branch)"
    read -p "Switch to development branch? (y/N): " switch_branch
    if [[ $switch_branch =~ ^[Yy]$ ]]; then
        git checkout development
        print_status "Switched to development branch"
    else
        echo "❌ Deployment cancelled"
        exit 1
    fi
fi

# Check for uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
    print_info "You have uncommitted changes:"
    git status --short
    echo ""
    read -p "Commit changes before deploying? (y/N): " commit_changes
    
    if [[ $commit_changes =~ ^[Yy]$ ]]; then
        git add .
        git commit -m "feat: development deployment - $(date '+%Y-%m-%d %H:%M:%S')"
        print_status "Changes committed"
    else
        print_warning "Deploying with uncommitted changes"
    fi
fi

# Pull latest changes
print_info "Pulling latest changes from remote..."
git pull origin development

# Push to trigger deployment
print_info "Pushing to development branch to trigger deployment..."
git push origin development

print_status "Development deployment triggered!"
echo ""
print_info "Your app will be available at:"
echo "  🌐 https://dev.fanclubz.app (if custom domain configured)"
echo "  🔗 https://fan-club-z.vercel.app (current Vercel URL)"
echo ""
print_info "Deployment typically takes 2-3 minutes to complete"
print_info "Check Vercel dashboard for deployment status"