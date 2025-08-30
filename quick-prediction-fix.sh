#!/bin/bash

# Fan Club Z - Quick Prediction Field Fix
# Fixes the stake field validation and type conversion issues

echo "🔧 Applying quick prediction field fix..."

# Set error handling
set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️ $1${NC}"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "Must be run from project root directory"
    exit 1
fi

print_info "Applying prediction field fixes..."

# Add the updated files
git add client/src/store/predictionStore.ts
git add client/src/stores/predictionStore.ts

# Commit the fix
COMMIT_MESSAGE="🔧 Fix prediction creation field validation

- Fixed stake_min/stake_max field conversion from string to number
- Added proper validation for stake values
- Fixed type conversion for 'multiple' -> 'multi_outcome'
- Ensured null handling for optional fields
- Added better error messages for validation failures

Resolves: 'null value in column stake_min' constraint violation"

git commit -m "$COMMIT_MESSAGE"

print_status "Field validation fixes committed"

# Push to trigger deployment
git push origin main

print_status "Fix pushed - deployments will trigger automatically"

echo ""
echo "🎯 What was fixed:"
echo "=================="
echo "✅ stake_min field now properly converts string to number"
echo "✅ Added validation for minimum stake amount (₦1)"
echo "✅ Fixed null value handling for optional fields"
echo "✅ 'multiple' type now correctly converts to 'multi_outcome'"
echo "✅ Better error messages for validation failures"
echo ""
echo "🧪 Test the fix:"
echo "==============="
echo "1. Wait 2-3 minutes for deployment"
echo "2. Try creating a prediction with minimum stake ₦100"
echo "3. Verify it creates successfully without database errors"
echo ""
echo "🌐 Production App: https://fan-club-z.vercel.app"
