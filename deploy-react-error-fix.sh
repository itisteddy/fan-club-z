#!/bin/bash

echo "🚀 Deploying React Error Fix - BetsTab Component & API Routes"
echo "=============================================================="

# Set error handling
set -e

# Get timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
VERSION="2.0.54"

echo "📅 Deployment started at: $(date)"
echo "🔧 Version: $VERSION"

# Navigate to project directory
cd "$(dirname "$0")"

echo ""
echo "📋 Changes being deployed:"
echo "  ✅ Fixed BetsTab React component rendering issues"
echo "  ✅ Added missing prediction store methods"
echo "  ✅ Updated ManagePredictionModal props"
echo "  ✅ Added new prediction-entries API routes"
echo "  ✅ Enhanced predictions API with database queries"
echo "  ✅ Fixed component mapping and key props"

echo ""
echo "🔄 Building and deploying..."

# Build the client
echo "📦 Building client application..."
cd client
npm run build
cd ..

# Build the server
echo "🖥️  Building server application..."
cd server
npm run build
cd ..

echo ""
echo "📡 Deploying to Render..."

# Add all changes
git add .

# Commit changes
git commit -m "fix: resolve BetsTab React component errors and add missing API endpoints

- Fixed React component rendering issues in BetsTab
- Added missing prediction store methods (fetchUserPredictionEntries, getUserCreatedPredictions, etc.)
- Enhanced prediction management methods (updatePrediction, deletePrediction, closePrediction)
- Added prediction-entries API routes
- Updated predictions API with real Supabase database queries
- Fixed component mapping with proper error handling and key props
- Improved ManagePredictionModal props handling
- Removed unused imports to prevent conflicts

Version: $VERSION
Timestamp: $TIMESTAMP"

# Push to trigger deployment
git push origin main

echo ""
echo "✅ Deployment initiated successfully!"
echo ""
echo "🔗 Monitor deployment progress:"
echo "   - Render Dashboard: https://dashboard.render.com"
echo "   - Application URL: https://app.fanclubz.app"
echo "   - API Health: https://fan-club-z.onrender.com/health"
echo ""
echo "📊 Expected fixes:"
echo "   1. BetsTab component will render without 'r is not a function' error"
echo "   2. User prediction data will load properly"
echo "   3. ManagePredictionModal will work without errors"
echo "   4. API endpoints for user data will be available"
echo "   5. Database queries will return real data instead of empty arrays"
echo ""
echo "⏱️  Deployment typically completes in 2-3 minutes"
echo "🔄 The application will automatically restart once deployment is complete"

# Wait a moment for git push to complete
sleep 2

echo ""
echo "🎯 Deployment Summary:"
echo "  📅 Started: $(date)"
echo "  🔧 Version: $VERSION"
echo "  📝 Commit: React error fixes and API enhancements"
echo "  🌐 Target: Production (app.fanclubz.app)"
echo ""
echo "✨ Deployment script completed successfully!"
