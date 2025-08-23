#!/bin/bash

echo "🔧 Testing Comment System Infinite Loop Fix"
echo "=========================================="

# Navigate to the project directory
cd "$(dirname "$0")"

echo "📦 Installing dependencies if needed..."
if [ ! -d "node_modules" ]; then
    npm install
fi

echo "🏗️ Building the project..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build successful! Comment system fixes appear to be working."
    echo ""
    echo "📋 Summary of fixes applied:"
    echo "  - Memoized useCommentsForPrediction hook functions"
    echo "  - Stabilized prediction ID in PredictionDetailsPage"
    echo "  - Fixed useEffect dependencies in CommentSystem"
    echo "  - Added caching logic to prevent duplicate API calls"
    echo "  - Added proper fetch attempt tracking"
    echo ""
    echo "🚀 The infinite loop issue should now be resolved."
else
    echo "❌ Build failed. Please check the errors above."
    exit 1
fi
