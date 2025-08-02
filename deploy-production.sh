#!/bin/bash

# Fan Club Z - Production Deployment Script
# Deploy to production with safety checks

set -e

echo "🎯 Fan Club Z - Production Deployment"
echo "====================================="

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

# Ensure we're on staging branch
if [ "$current_branch" != "staging" ]; then
    print_warning "You should be on staging branch for production deployment"
    read -p "Switch to staging branch? (y/N): " switch_branch
    if [[ $switch_branch =~ ^[Yy]$ ]]; then
        git checkout staging
        print_status "Switched to staging branch"
    else
        print_error "Production deployment cancelled"
        exit 1
    fi
fi

# Check for uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
    print_error "Cannot deploy with uncommitted changes"
    print_info "Please commit or stash your changes first"
    exit 1
fi

# Pull latest changes
print_info "Pulling latest changes from staging..."
git pull origin staging

# Safety confirmation
echo ""
print_warning "🚨 PRODUCTION DEPLOYMENT WARNING 🚨"
echo "=========================================="
echo ""
print_info "You are about to deploy to PRODUCTION:"
echo "  🌐 https://fanclubz.app"
echo "  👥 This will be visible to ALL users"
echo ""
print_info "Before proceeding, ensure:"
echo "  ✅ All features have been tested on staging"
echo "  ✅ No critical bugs are present"
echo "  ✅ Database migrations are ready"
echo "  ✅ Environment variables are configured"
echo ""

read -p "Have you tested everything on staging? (y/N): " tested_staging
if [[ ! $tested_staging =~ ^[Yy]$ ]]; then
    print_error "Please test on staging first: npm run deploy:staging"
    exit 1
fi

echo ""
read -p "Are you absolutely sure you want to deploy to PRODUCTION? (y/N): " confirm_production
if [[ ! $confirm_production =~ ^[Yy]$ ]]; then
    print_error "Production deployment cancelled"
    exit 1
fi

echo ""
read -p "Type 'DEPLOY' to confirm production deployment: " deploy_confirm
if [[ $deploy_confirm != "DEPLOY" ]]; then
    print_error "Production deployment cancelled"
    exit 1
fi

# Switch to main branch
print_info "Switching to main branch..."
git checkout main

# Merge staging into main
print_info "Merging staging into main..."
if git merge staging --no-edit; then
    print_status "Staging merged into main successfully"
else
    print_error "Merge conflict detected. Please resolve conflicts and try again."
    print_info "You can:"
    print_info "  1. Resolve conflicts manually"
    print_info "  2. Run: git merge --abort to cancel"
    print_info "  3. Try again after resolving conflicts"
    exit 1
fi

# Create a deployment tag
tag_name="v$(date '+%Y.%m.%d-%H%M')"
print_info "Creating deployment tag: $tag_name"
git tag -a "$tag_name" -m "Production deployment $(date '+%Y-%m-%d %H:%M:%S')"

# Push main branch and tag
print_info "Pushing main branch and tag to trigger deployment..."
git push origin main
git push origin "$tag_name"

print_status "Production deployment triggered!"
echo ""
print_info "Your production app will be available at:"
echo "  🌐 https://fanclubz.app"
echo "  🔗 https://fan-club-z.vercel.app"
echo ""
print_info "Deployment typically takes 3-5 minutes to complete"
print_info "Monitor deployment status in Vercel dashboard"
echo ""
print_info "Deployment tag: $tag_name"
print_info "This tag can be used for rollback if needed"
echo ""
print_info "Next steps:"
echo "  1. Wait for deployment to complete"
echo "  2. Verify production site is working"
echo "  3. Monitor for any issues"
echo "  4. If issues arise, you can rollback using the tag: $tag_name"