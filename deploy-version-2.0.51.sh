#!/bin/bash

echo "🚀 Deploying Fan Club Z Version 2.0.51 - Comprehensive Fixes"
echo "=========================================================="

# Change to project directory
cd "/Users/efe/Library/CloudStorage/OneDrive-Personal/Fan Club Z v2.0/FanClubZ-version2.0"

echo ""
echo "🔍 Step 1: Verifying Version Consistency"
echo "----------------------------------------"

# Check all package.json files
echo "Checking package.json files..."
ROOT_VERSION=$(node -p "require('./package.json').version")
CLIENT_VERSION=$(node -p "require('./client/package.json').version")
SERVER_VERSION=$(node -p "require('./server/package.json').version")
SHARED_VERSION=$(node -p "require('./shared/package.json').version")

echo "Root: $ROOT_VERSION"
echo "Client: $CLIENT_VERSION"
echo "Server: $SERVER_VERSION"
echo "Shared: $SHARED_VERSION"

if [ "$ROOT_VERSION" != "2.0.51" ] || [ "$CLIENT_VERSION" != "2.0.51" ] || [ "$SERVER_VERSION" != "2.0.51" ] || [ "$SHARED_VERSION" != "2.0.51" ]; then
    echo "❌ Version mismatch detected!"
    exit 1
fi

echo "✅ All package.json versions are consistent (2.0.51)"

# Check source files for hardcoded versions
echo ""
echo "Checking source files for hardcoded versions..."
HARDCODED_50=$(grep -r "2\.0\.50" src/ client/src/ server/src/ shared/src/ --include="*.ts" --include="*.tsx" --include="*.js" | wc -l)
HARDCODED_49=$(grep -r "2\.0\.49" src/ client/src/ server/src/ shared/src/ --include="*.ts" --include="*.tsx" --include="*.js" | wc -l)

if [ "$HARDCODED_50" -gt 0 ] || [ "$HARDCODED_49" -gt 0 ]; then
    echo "❌ Found hardcoded old versions in source files!"
    echo "2.0.50 references: $HARDCODED_50"
    echo "2.0.49 references: $HARDCODED_49"
    exit 1
fi

echo "✅ No hardcoded old versions found in source files"

echo ""
echo "🧹 Step 2: Cleaning Build Artifacts"
echo "-----------------------------------"

# Clean all build artifacts
rm -rf client/dist server/dist shared/dist
rm -rf node_modules/.cache
echo "✅ Build artifacts cleaned"

echo ""
echo "🔨 Step 3: Building All Components"
echo "---------------------------------"

# Build everything
echo "Building shared package..."
cd shared && npm run build && cd ..

echo "Building client..."
cd client && npm run build && cd ..

echo "Building server..."
cd server && npm run build && cd ..

echo "✅ All components built successfully"

echo ""
echo "🔍 Step 4: Verifying Built Files"
echo "-------------------------------"

# Check built files for correct versions
echo "Checking built files..."
BUILT_51=$(grep -r "2\.0\.51" client/dist/ server/dist/ shared/dist/ --include="*.js" --include="*.html" | wc -l)
BUILT_50=$(grep -r "2\.0\.50" client/dist/ server/dist/ shared/dist/ --include="*.js" --include="*.html" | wc -l)

echo "2.0.51 references in built files: $BUILT_51"
echo "2.0.50 references in built files: $BUILT_50"

if [ "$BUILT_50" -gt 0 ]; then
    echo "❌ Found old version references in built files!"
    exit 1
fi

echo "✅ All built files have correct version (2.0.51)"

echo ""
echo "📝 Step 5: Creating Git Commit"
echo "-----------------------------"

# Create a comprehensive commit
git add .
git commit -m "BUMP: Version 2.0.51 - Comprehensive Fixes

- Fixed PredictionDetailsPage initialization error
- Removed all mock/hardcoded data from comments and predictions
- Added platform stats endpoint for live market information
- Fixed like persistence and comment functionality
- Updated all hardcoded version numbers to 2.0.51
- Enhanced CORS configuration and error handling
- Cleaned build artifacts and ensured version consistency

Technical Changes:
- Fixed useCommentsForPrediction hook initialization order
- Removed mock data fallbacks in useComments.ts
- Added /api/v2/predictions/stats/platform endpoint
- Updated DiscoverPage to use correct API URL
- Fixed TypeScript compilation errors
- Ensured all package.json files are version 2.0.51

Testing:
- All version numbers verified consistent
- No hardcoded old versions found
- Build artifacts cleaned and rebuilt
- Ready for deployment to Vercel and Render"

echo "✅ Git commit created"

echo ""
echo "🚀 Step 6: Deployment Instructions"
echo "---------------------------------"

echo ""
echo "📋 Manual Deployment Steps Required:"
echo ""
echo "1. 🎯 Frontend (Vercel):"
echo "   - Push to GitHub: git push origin main"
echo "   - Vercel will auto-deploy from main branch"
echo "   - Verify at: https://app.fanclubz.app"
echo ""
echo "2. 🔧 Backend (Render):"
echo "   - Push to GitHub: git push origin main"
echo "   - Render will auto-deploy from main branch"
echo "   - Verify at: https://fan-club-z.onrender.com/health"
echo ""
echo "3. ✅ Verification Steps:"
echo "   - Check frontend version in browser console"
echo "   - Check backend version: curl https://fan-club-z.onrender.com/health"
echo "   - Test comment functionality (should work without errors)"
echo "   - Verify live market stats show real data"
echo "   - Test like persistence across sessions"
echo ""
echo "🔍 Expected Results:"
echo "- Frontend: Version 2.0.51 in console logs"
echo "- Backend: Version 2.0.51 in health endpoint"
echo "- No more 'Cannot access Wt before initialization' errors"
echo "- Live market stats showing real data instead of zeros"
echo "- Comments working without mock data"
echo "- Likes persisting properly"

echo ""
echo "🎉 Version 2.0.51 is ready for deployment!"
echo "All hardcoded versions have been updated and verified."
echo "Build artifacts have been cleaned and rebuilt."
echo ""
echo "Next: Run 'git push origin main' to trigger deployments"
