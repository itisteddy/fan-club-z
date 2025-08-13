#!/bin/bash

# 🔄 ENVIRONMENT SWAP ROLLBACK SCRIPT
# Use this if the environment swap didn't work as expected

set -e

echo "🔄 Fan Club Z - Environment Swap Rollback"
echo "========================================"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Check if backup branches exist
echo -e "${BLUE}🔍 Looking for backup branches...${NC}"

BACKUP_BRANCHES=$(git branch -r | grep "backup.*before-swap" | head -10)

if [ -z "$BACKUP_BRANCHES" ]; then
    echo -e "${RED}❌ No backup branches found!${NC}"
    echo "Backup branches should be named like: backup-main-before-swap-YYYYMMDD-HHMMSS"
    exit 1
fi

echo -e "${GREEN}✅ Found backup branches:${NC}"
echo "$BACKUP_BRANCHES"
echo ""

# Let user select which backup to restore from
echo "Available backup timestamps:"
TIMESTAMPS=$(echo "$BACKUP_BRANCHES" | grep -o '[0-9]\{8\}-[0-9]\{6\}' | sort -u)
echo "$TIMESTAMPS"
echo ""

read -p "Enter the timestamp you want to rollback to (YYYYMMDD-HHMMSS): " SELECTED_TIMESTAMP

if [ -z "$SELECTED_TIMESTAMP" ]; then
    echo -e "${RED}❌ No timestamp provided${NC}"
    exit 1
fi

# Validate timestamp format
if ! [[ $SELECTED_TIMESTAMP =~ ^[0-9]{8}-[0-9]{6}$ ]]; then
    echo -e "${RED}❌ Invalid timestamp format. Use: YYYYMMDD-HHMMSS${NC}"
    exit 1
fi

# Check if the backup branches exist
MAIN_BACKUP="backup-main-before-swap-$SELECTED_TIMESTAMP"
DEV_BACKUP="backup-dev-before-swap-$SELECTED_TIMESTAMP"

if ! git rev-parse --verify "origin/$MAIN_BACKUP" >/dev/null 2>&1; then
    echo -e "${RED}❌ Main backup branch not found: $MAIN_BACKUP${NC}"
    exit 1
fi

if ! git rev-parse --verify "origin/$DEV_BACKUP" >/dev/null 2>&1; then
    echo -e "${RED}❌ Development backup branch not found: $DEV_BACKUP${NC}"
    exit 1
fi

echo -e "${YELLOW}⚠️  This will restore your branches to the state before the swap.${NC}"
echo "Main branch will be restored from: $MAIN_BACKUP"
echo "Development branch will be restored from: $DEV_BACKUP"
echo ""
read -p "Are you sure you want to proceed? (type 'yes'): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo -e "${RED}❌ Rollback cancelled${NC}"
    exit 1
fi

echo -e "${BLUE}📝 Step 1: Creating rollback backup...${NC}"

# Create a backup of current state before rollback
ROLLBACK_TIMESTAMP=$(date +%Y%m%d-%H%M%S)

git checkout main
git checkout -b "backup-main-before-rollback-$ROLLBACK_TIMESTAMP"
git push origin "backup-main-before-rollback-$ROLLBACK_TIMESTAMP"

git checkout development
git checkout -b "backup-dev-before-rollback-$ROLLBACK_TIMESTAMP"  
git push origin "backup-dev-before-rollback-$ROLLBACK_TIMESTAMP"

echo -e "${GREEN}✅ Current state backed up${NC}"

echo -e "${BLUE}📝 Step 2: Restoring from backup branches...${NC}"

# Restore main branch
git checkout main
git reset --hard "origin/$MAIN_BACKUP"
git commit --allow-empty -m "rollback: restored main branch from $MAIN_BACKUP

- Rolled back from environment swap
- Previous state backed up as: backup-main-before-rollback-$ROLLBACK_TIMESTAMP
- Rollback timestamp: $ROLLBACK_TIMESTAMP"

# Restore development branch
git checkout development
git reset --hard "origin/$DEV_BACKUP"
git commit --allow-empty -m "rollback: restored development branch from $DEV_BACKUP

- Rolled back from environment swap  
- Previous state backed up as: backup-dev-before-rollback-$ROLLBACK_TIMESTAMP
- Rollback timestamp: $ROLLBACK_TIMESTAMP"

echo -e "${GREEN}✅ Branches restored from backup${NC}"

echo -e "${BLUE}📝 Step 3: Pushing restored branches...${NC}"

# Push the restored branches
git checkout main
git push origin main --force-with-lease

git checkout development
git push origin development --force-with-lease

echo -e "${GREEN}✅ Rollback completed successfully${NC}"

echo ""
echo -e "${GREEN}🎉 ROLLBACK COMPLETED!${NC}"
echo "====================="
echo ""
echo "📋 What happened:"
echo "1. Current state backed up with timestamp: $ROLLBACK_TIMESTAMP"
echo "2. Main branch restored from: $MAIN_BACKUP"
echo "3. Development branch restored from: $DEV_BACKUP"
echo "4. New deployments triggered"
echo ""
echo "🔍 Monitor the deployments at:"
echo "   https://vercel.com/dashboard"
echo ""
echo "⏱️  Wait 2-3 minutes for deployments to complete, then verify your environments"
