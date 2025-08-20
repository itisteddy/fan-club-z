#!/bin/bash

# Emergency fix for React error and database seeding
echo "🚑 Applying emergency fixes for Fan Club Z v2.0.47..."

cd "/Users/efe/Library/CloudStorage/OneDrive-Personal/Fan Club Z v2.0/FanClubZ-version2.0"

# 1. Fix the database seeding script
echo "🔧 Fixing database seeding script..."
git add .
git commit -m "🔧 Emergency fix: Remove bio field from seeding script

- Remove non-existent bio field from users table
- Fix database schema compatibility
- Enable proper database seeding

This fixes the PGRST204 error preventing database seeding."

# 2. Deploy the seeding fix
echo "🚀 Deploying seeding fix..."
git push origin main

echo "✅ Fix deployed! Waiting for deployment..."
echo ""
echo "📋 Next steps after deployment (30 seconds):"
echo "1. Test seeding: curl -X POST https://fan-club-z.onrender.com/api/v2/admin/seed-database"
echo "2. Verify API: curl https://fan-club-z.onrender.com/api/v2/predictions"
echo "3. Check frontend: https://app.fanclubz.app"
echo ""
echo "🎯 This should fix:"
echo "- Database seeding errors (bio field issue)"
echo "- Empty prediction arrays"
echo "- React error #185 (caused by empty data)"
