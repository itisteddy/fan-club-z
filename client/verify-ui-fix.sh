#!/bin/bash

# UI Onboarding Media Fix - Verification Script
# Run this after deploying to verify all changes are working

echo "🔍 Verifying UI Onboarding Media Fix Implementation..."
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counters
PASS=0
FAIL=0
WARN=0

# Function to check file exists
check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} File exists: $1"
        ((PASS++))
        return 0
    else
        echo -e "${RED}✗${NC} File missing: $1"
        ((FAIL++))
        return 1
    fi
}

# Function to check content in file
check_content() {
    local file=$1
    local pattern=$2
    local description=$3
    
    if [ ! -f "$file" ]; then
        echo -e "${RED}✗${NC} Cannot check '$description' - file not found: $file"
        ((FAIL++))
        return 1
    fi
    
    if grep -q "$pattern" "$file"; then
        echo -e "${GREEN}✓${NC} $description"
        ((PASS++))
        return 0
    else
        echo -e "${RED}✗${NC} Missing: $description"
        ((FAIL++))
        return 1
    fi
}

echo "📂 Checking Files..."
check_file "api/media-search.ts"
check_file "src/components/onboarding/steps.ts"
check_file "src/components/CategoryFilter.tsx"

echo ""
echo "🎨 Checking Category Chips..."
check_content "src/components/CategoryFilter.tsx" "h-\[28px\]" "28px height chips"
check_content "src/components/CategoryFilter.tsx" "data-tour=\"category-chips\"" "Container data-tour attribute"
check_content "src/components/CategoryFilter.tsx" "data-tour=\"category-chips-item\"" "Item data-tour attributes"

echo ""
echo "🎯 Checking Onboarding..."
check_content "src/components/onboarding/steps.ts" "discover-header" "Discover header target"
check_content "src/components/onboarding/steps.ts" "category-chips" "Category chips target"
check_content "src/components/onboarding/steps.ts" "nav-wallet" "Wallet nav target"
check_content "src/components/onboarding/steps.ts" "nav-profile" "Profile nav target"
check_content "src/components/onboarding/OnboardingProvider.tsx" "canRunTour" "Tour gating logic"
check_content "src/components/navigation/BottomNavigation.tsx" "data-tour=" "Nav data-tour attributes"
check_content "src/pages/DiscoverPage.tsx" "data-tour=\"discover-header\"" "Discover page header attribute"

echo ""
echo "🖼️ Checking Media Proxy..."
check_content "api/media-search.ts" "CACHE_TTL_MS" "Cache implementation"
check_content "api/media-search.ts" "fetchPexels" "Pexels integration"
check_content "api/media-search.ts" "fetchUnsplash" "Unsplash integration"
check_content "src/lib/media/resolveMedia.ts" "MEDIA_ENDPOINT" "Media endpoint constant"
check_content "src/lib/media/resolveMedia.ts" "USE_PROXY" "Proxy flag"
check_content "vercel.json" "/media/search" "Vercel rewrite"

echo ""
echo "📝 Checking Documentation..."
check_file "UI_ONBOARDING_MEDIA_FIX.md"
check_file "QUICK_REFERENCE_UI_FIX.md"

echo ""
echo "═══════════════════════════════════════"
echo "📊 Results Summary"
echo "═══════════════════════════════════════"
echo -e "${GREEN}✓ Passed: $PASS${NC}"
echo -e "${RED}✗ Failed: $FAIL${NC}"

echo ""
if [ $FAIL -eq 0 ]; then
    echo -e "${GREEN}🎉 All checks passed!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Test locally with 'vercel dev' or 'npm run dev'"
    echo "2. Verify chips are shorter (28px)"
    echo "3. Test onboarding tour (must be signed in)"
    echo "4. Check Network tab for /media/search calls"
    echo "5. Deploy and test in production"
    echo ""
    echo "Environment variables to set in Vercel:"
    echo "  - PEXELS_API_KEY"
    echo "  - UNSPLASH_ACCESS_KEY"
    exit 0
else
    echo -e "${RED}❌ Some checks failed. Please review the output above.${NC}"
    exit 1
fi
