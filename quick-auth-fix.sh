#!/bin/bash

set -e

echo "🚀 Quick Fix: Auth Guard Issue"

# Navigate to project directory
cd "$(dirname "$0")"

echo "🔨 Building client with auth guard fix..."
cd client
npm run build

echo "✅ Build complete!"

# If this is a Vercel deployment
if [ -n "$VERCEL" ]; then
    echo "🌍 Vercel deployment detected"
    echo "✅ Build ready for Vercel"
elif [ -f "../vercel.json" ]; then
    echo "🌍 Deploying to Vercel..."
    cd ..
    npx vercel --prod
else
    echo "🏠 Local build complete"
    echo "📱 Run 'npm run dev' from the client directory to test locally"
fi

echo ""
echo "✅ AUTH GUARD FIX APPLIED:"
echo "  • Switched from BetsTab to PredictionsTab in App.tsx"
echo "  • Added proper session + store auth sync in PredictionsTab" 
echo "  • Added loading states and debug logging"
echo "  • Added fallback auth logic to prevent auth gate when user is logged in"
echo ""
echo "🔍 Check browser console for 'PredictionsTab auth state' debug logs"
