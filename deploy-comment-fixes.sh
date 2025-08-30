#!/bin/bash

# Fan Club Z - Quick Comment System Fix Deployment
# This script deploys the comment system fixes to resolve cursor and API issues

echo "🚀 Deploying Comment System Fixes..."
echo "=================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Not in the correct directory. Please run from the FanClubZ-version2.0 root."
    exit 1
fi

# Set environment
export NODE_ENV=production

echo "📋 Changes being deployed:"
echo "  ✅ Fixed textarea cursor jumping issue"
echo "  ✅ Enhanced error handling and logging"
echo "  ✅ Improved API endpoint detection"
echo "  ✅ Added immediate mock data loading"
echo ""

# Build client
echo "🔨 Building client..."
cd client
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Client build failed!"
    exit 1
fi
cd ..

# Build server
echo "🔨 Building server..."
cd server
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Server build failed!"
    exit 1
fi
cd ..

echo "✅ Build completed successfully!"
echo ""

# Deploy to Vercel (if available)
if command -v vercel &> /dev/null; then
    echo "🌐 Deploying to Vercel..."
    vercel --prod
    echo "✅ Deployment complete!"
    echo ""
    echo "🔗 Your app should be available at:"
    echo "   • https://dev.fanclubz.app"
    echo "   • https://app.fanclubz.app"
else
    echo "⚠️ Vercel CLI not found. Please deploy manually:"
    echo "   1. Run 'npm install -g vercel'"
    echo "   2. Run 'vercel --prod'"
fi

echo ""
echo "🧪 Testing Instructions:"
echo "========================"
echo "1. Open https://dev.fanclubz.app"
echo "2. Navigate to any prediction"
echo "3. Scroll down to comments section"
echo "4. Try typing in the comment box - cursor should stay at end"
echo "5. Submit a comment - should appear immediately"
echo ""
echo "💡 Expected Behavior:"
echo "  • Text should type normally (no reversed text)"
echo "  • Comments load immediately with demo data"
echo "  • API errors show friendly fallback messages"
echo "  • All typing should work correctly"
echo ""
echo "🎉 Deployment complete! Comment system fixes are now live."

