#!/bin/bash

# 🔍 ENVIRONMENT VERIFICATION SCRIPT
# Checks the current state of your environments after swap

echo "🔍 Fan Club Z - Environment Verification"
echo "======================================="

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}📋 Checking current branch status...${NC}"

# Check current branch
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo "Current branch: $CURRENT_BRANCH"

# Check last commits on each branch
echo ""
echo -e "${BLUE}📝 Recent commits:${NC}"
echo ""
echo "MAIN branch (production):"
git log main --oneline -3

echo ""
echo "DEVELOPMENT branch:"
git log development --oneline -3

echo ""
echo -e "${BLUE}🌐 Expected URLs:${NC}"
echo "Production: https://app.fanclubz.app (or your production Vercel URL)"
echo "Development: https://dev.fanclubz.app (or your development Vercel URL)"

echo ""
echo -e "${BLUE}🔍 What to check manually:${NC}"
echo ""
echo "1. Open production URL and verify:"
echo "   - Clean, professional interface"
echo "   - No debug information visible"
echo "   - Production data/content"
echo "   - VITE_ENVIRONMENT should be 'production' (check in browser console)"
echo ""
echo "2. Open development URL and verify:"
echo "   - Development features enabled"
echo "   - Debug information may be visible"
echo "   - Test data/content"
echo "   - VITE_ENVIRONMENT should be 'development' (check in browser console)"
echo ""
echo -e "${YELLOW}💡 Browser Console Check:${NC}"
echo "Open browser console (F12) and run:"
echo "  console.log('Environment:', import.meta.env.VITE_ENVIRONMENT)"
echo "  console.log('Debug Mode:', import.meta.env.VITE_DEBUG)"
echo ""

# Check Vercel environment variables (if vercel CLI is available)
if command -v vercel &> /dev/null; then
    echo -e "${BLUE}🔧 Vercel Environment Variables:${NC}"
    echo "Checking production environment variables..."
    vercel env ls --environment=production 2>/dev/null || echo "  (Run 'vercel env ls --environment=production' to check manually)"
    
    echo "Checking preview environment variables..."
    vercel env ls --environment=preview 2>/dev/null || echo "  (Run 'vercel env ls --environment=preview' to check manually)"
else
    echo -e "${YELLOW}💡 Vercel CLI not found. Check environment variables manually at:${NC}"
    echo "   https://vercel.com/dashboard → Your Project → Settings → Environment Variables"
fi

echo ""
echo -e "${BLUE}🎯 Success Criteria:${NC}"
echo ""
echo "✅ Production environment should show:"
echo "   - VITE_ENVIRONMENT = 'production'"
echo "   - VITE_DEBUG = 'false' or undefined"
echo "   - Professional UI, no debug elements"
echo "   - SSL certificate working"
echo ""
echo "✅ Development environment should show:"
echo "   - VITE_ENVIRONMENT = 'development'"  
echo "   - VITE_DEBUG = 'true'"
echo "   - Development features enabled"
echo "   - Debug information available"
echo ""

# Check for backup branches
echo -e "${BLUE}🛡️  Available backup branches:${NC}"
BACKUP_BRANCHES=$(git branch -r | grep "backup.*before-swap" | head -5)
if [ ! -z "$BACKUP_BRANCHES" ]; then
    echo "$BACKUP_BRANCHES"
    echo ""
    echo -e "${GREEN}✅ Backup branches are available for rollback if needed${NC}"
else
    echo -e "${YELLOW}⚠️  No backup branches found${NC}"
fi

echo ""
echo -e "${BLUE}📞 Need to rollback?${NC}"
echo "If the swap didn't work correctly, run:"
echo "  chmod +x rollback-environment-swap.sh"
echo "  ./rollback-environment-swap.sh"

echo ""
echo -e "${BLUE}🎉 All checks complete!${NC}"
echo "Manually verify the URLs above to confirm the swap was successful."
