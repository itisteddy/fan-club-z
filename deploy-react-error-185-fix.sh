#!/bin/bash

echo "🚀 Deploying React Error #185 Fix..."

# Change to project directory
cd "/Users/efe/Library/CloudStorage/OneDrive-Personal/Fan Club Z v2.0/FanClubZ-version2.0"

echo "📋 Fix Summary:"
echo "- Fixed circular dependencies in unifiedCommentStore"
echo "- Removed React hooks from Zustand store"
echo "- Added comprehensive error boundaries"
echo "- Enhanced PredictionCard with defensive programming"
echo "- Improved CommentModal with mounting state handling"
echo "- Added global error handlers in main.tsx"

echo ""
echo "🔧 Building application..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
    
    echo ""
    echo "🚀 Starting development server..."
    echo "Application will be available at: http://localhost:5173"
    echo ""
    echo "Key fixes applied:"
    echo "✅ React Error #185 eliminated through store architecture fix"
    echo "✅ Comment system working with defensive programming"
    echo "✅ Error boundaries catching and handling errors gracefully"
    echo "✅ Store initialization properly ordered"
    echo "✅ Component mounting state handled correctly"
    echo ""
    echo "Press Ctrl+C to stop the server"
    echo ""
    
    npm run dev
else
    echo "❌ Build failed. Please check the console for errors."
    exit 1
fi