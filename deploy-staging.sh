#!/bin/bash

# Fan Club Z - Staging Deployment Script
# Deploy to staging environment for testing

set -e

echo "🧪 Fan Club Z - Staging Deployment"
echo "==================================="

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
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

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "Not in Fan Club Z project directory"
    exit 1
fi

# Check current branch
current_branch=$(git branch --show-current)
print_info "Current branch: $current_branch"

# Ensure we're on development branch
if [ "$current_branch" != "development" ]; then
    print_warning "You should be on development branch for staging deployment"
    read -p "Switch to development branch? (y/N): " switch_branch
    if [[ $switch_branch =~ ^[Yy]$ ]]; then
        git checkout development
        print_status "Switched to development branch"
    else
        print_error "Staging deployment cancelled"
        exit 1
    fi
fi

# Check for uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
    print_warning "You have uncommitted changes:"
    git status --short
    echo ""
    read -p "Commit changes before staging deployment? (y/N): " commit_changes
    
    if [[ $commit_changes =~ ^[Yy]$ ]]; then
        git add .
        git commit -m "feat: staging deployment - $(date '+%Y-%m-%d %H:%M:%S')"
        print_status "Changes committed"
    else
        print_error "Cannot proceed with uncommitted changes"
        exit 1
    fi
fi

# Pull latest changes
print_info "Pulling latest changes from development..."
git pull origin development

# Switch to staging branch
print_info "Switching to staging branch..."
git checkout staging

# Merge development into staging
print_info "Merging development into staging..."
if git merge development --no-edit; then
    print_status "Development merged into staging successfully"
else
    print_error "Merge conflict detected. Please resolve conflicts and try again."
    print_info "You can:"
    print_info "  1. Resolve conflicts manually"
    print_info "  2. Run: git merge --abort to cancel"
    print_info "  3. Try again after resolving conflicts"
    exit 1
fi

# Push staging branch
print_info "Pushing staging branch to trigger deployment..."
git push origin staging

print_status "Staging deployment triggered!"
echo ""
print_info "Your staging app will be available at:"
echo "  🌐 https://staging.fanclubz.app (if custom domain configured)"
echo "  🔗 https://fan-club-z.vercel.app (current Vercel URL)"
echo ""
print_info "Deployment typically takes 2-3 minutes to complete"
print_info "Test thoroughly on staging before production deployment"
echo ""
print_info "Next steps:"
echo "  1. Wait for deployment to complete"
echo "  2. Test all features on staging"
echo "  3. When ready, run: npm run deploy:production"