#!/bin/bash

# 🚨 EMERGENCY ENVIRONMENT SWAP SCRIPT
# This script safely swaps production and development environments

set -e  # Exit on any error

echo "🚨 Fan Club Z - Emergency Environment Swap"
echo "========================================="

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get current timestamp for backup naming
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

echo -e "${YELLOW}⚠️  WARNING: This will swap your production and development environments!${NC}"
echo -e "${YELLOW}⚠️  Make sure you understand what this does before proceeding.${NC}"
echo ""
echo "Current situation analysis:"
echo "- Production appears to be running development/test code"
echo "- Development appears to be running production code"
echo ""
read -p "Do you want to continue? (type 'yes' to proceed): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo -e "${RED}❌ Aborted by user${NC}"
    exit 1
fi

echo -e "${BLUE}📝 Step 1: Creating backup branches...${NC}"

# Check if we're in a git repository
if [ ! -d ".git" ]; then
    echo -e "${RED}❌ Error: Not in a git repository${NC}"
    exit 1
fi

# Get current branch
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo "Current branch: $CURRENT_BRANCH"

# Create backup branches
echo "Creating backup branches with timestamp: $TIMESTAMP"

# Backup main branch
git checkout main 2>/dev/null || { echo -e "${RED}❌ Error: Could not checkout main branch${NC}"; exit 1; }
git checkout -b "backup-main-before-swap-$TIMESTAMP"
git push origin "backup-main-before-swap-$TIMESTAMP"
echo -e "${GREEN}✅ Main branch backed up${NC}"

# Backup development branch  
git checkout development 2>/dev/null || { echo -e "${RED}❌ Error: Could not checkout development branch${NC}"; exit 1; }
git checkout -b "backup-dev-before-swap-$TIMESTAMP"
git push origin "backup-dev-before-swap-$TIMESTAMP"
echo -e "${GREEN}✅ Development branch backed up${NC}"

echo -e "${BLUE}📝 Step 2: Performing the branch content swap...${NC}"

# Create temporary branches to hold the content
git checkout main
git checkout -b "temp-main-content-$TIMESTAMP"

git checkout development
git checkout -b "temp-dev-content-$TIMESTAMP"

# Perform the actual swap
echo "Swapping branch contents..."

# Swap main branch to have development content
git checkout main
MAIN_CURRENT_COMMIT=$(git rev-parse HEAD)
git reset --hard "temp-dev-content-$TIMESTAMP"

# Swap development branch to have main content  
git checkout development
DEV_CURRENT_COMMIT=$(git rev-parse HEAD)
git reset --hard "temp-main-content-$TIMESTAMP"

echo -e "${GREEN}✅ Branch contents swapped${NC}"

echo -e "${BLUE}📝 Step 3: Updating commit messages...${NC}"

# Add commit messages explaining the swap
git checkout main
git commit --allow-empty -m "fix: emergency environment swap - restored production code to main branch

- Swapped content from development branch to main branch
- This fixes the issue where production was running dev/test code
- Backup created: backup-main-before-swap-$TIMESTAMP
- Previous main commit: $MAIN_CURRENT_COMMIT
- Timestamp: $TIMESTAMP"

git checkout development  
git commit --allow-empty -m "fix: emergency environment swap - moved production code to development

- Swapped content from main branch to development branch  
- This fixes the issue where development was running production code
- Backup created: backup-dev-before-swap-$TIMESTAMP
- Previous dev commit: $DEV_CURRENT_COMMIT
- Timestamp: $TIMESTAMP"

echo -e "${GREEN}✅ Commit messages added${NC}"

echo -e "${BLUE}📝 Step 4: Pushing changes and triggering redeployment...${NC}"

# Push the swapped branches
echo "Pushing main branch..."
git checkout main
git push origin main

echo "Pushing development branch..."
git checkout development
git push origin development

echo -e "${GREEN}✅ All changes pushed successfully${NC}"

# Clean up temporary branches
echo -e "${BLUE}📝 Step 5: Cleaning up temporary branches...${NC}"
git branch -D "temp-main-content-$TIMESTAMP" 2>/dev/null || true
git branch -D "temp-dev-content-$TIMESTAMP" 2>/dev/null || true

echo -e "${GREEN}✅ Cleanup completed${NC}"

echo ""
echo -e "${GREEN}🎉 ENVIRONMENT SWAP COMPLETED SUCCESSFULLY!${NC}"
echo "=========================================="
echo ""
echo "📋 What happened:"
echo "1. Created backup branches:"
echo "   - backup-main-before-swap-$TIMESTAMP"
echo "   - backup-dev-before-swap-$TIMESTAMP"
echo "2. Swapped the content between main and development branches"
echo "3. Triggered new deployments for both environments"
echo ""
echo "🔍 Next steps:"
echo "1. Wait 2-3 minutes for Vercel deployments to complete"
echo "2. Check your production URL - should now show production code"
echo "3. Check your development URL - should now show development features"
echo "4. Verify everything works correctly"
echo ""
echo "🚨 If something went wrong, you can rollback using:"
echo "   git checkout main && git reset --hard backup-main-before-swap-$TIMESTAMP"
echo "   git checkout development && git reset --hard backup-dev-before-swap-$TIMESTAMP"
echo ""
echo "📊 Monitor deployments at:"
echo "   https://vercel.com/dashboard"
echo ""

# Return to original branch if it still exists
if git rev-parse --verify "$CURRENT_BRANCH" >/dev/null 2>&1; then
    git checkout "$CURRENT_BRANCH"
else
    git checkout main
fi

echo -e "${BLUE}💡 Tip: Check the deployment logs in Vercel dashboard to confirm success${NC}"
