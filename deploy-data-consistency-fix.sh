#!/bin/bash

echo "🚀 DEPLOYING DATA CONSISTENCY & MONOREPO ARCHITECTURE FIXES"
echo "=========================================================="

# Update cache-buster to force frontend refresh
echo "📝 Updating cache-buster..."
sed -i '' 's/v2\.0\.79-20250815-demo-fix/v2.0.80-20250815-consistency-fix/' client/index.html

# Commit and push all changes
echo "📦 Committing changes..."
git add .
git commit -m "fix: Complete data consistency and monorepo architecture fixes

- Unified API-first data flow across all components
- Fixed monorepo build process for shared packages
- Updated dev script to use full server architecture
- Removed duplicate route definitions
- Consistent comment/like counts across UI components"

echo "🚀 Pushing to main branch..."
git push origin main

echo "✅ DEPLOYMENT TRIGGERED!"
echo ""
echo "🔍 Verification Steps:"
echo "1. Wait 2-3 minutes for Render deployment"
echo "2. Test API endpoints:"
echo "   curl https://fan-club-z.onrender.com/api/v2/predictions/6/likes"
echo "   curl https://fan-club-z.onrender.com/api/v2/predictions/6/comments"
echo "3. Check frontend: https://app.fanclubz.app"
echo "4. Verify consistent data across all UI components"
echo ""
echo "🎯 Expected Results:"
echo "- No more 404 errors for social features"
echo "- Consistent comment/like counts everywhere"
echo "- Real data persistence (not mock data)"
echo "- Full server architecture working in production"
echo "- Unified data flow eliminating confusion"
