#!/bin/bash

# Fan Club Z - Prediction Creation & Navigation Fix Deployment
echo "🔧 Starting prediction creation & navigation fixes deployment..."

# 1. Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Not in project root directory"
    exit 1
fi

# 2. Check for uncommitted changes
if ! git diff-index --quiet HEAD --; then
    echo "⚠️  Warning: You have uncommitted changes"
    echo "📝 Adding fixes to git..."
    git add .
    git commit -m "fix: prediction creation database schema and scroll-to-top navigation

- Fixed participant_count field in prediction creation payload
- Added scroll-to-top behavior for all navigation actions
- Improved UX by ensuring new screens start at the top
- Added timestamps to prediction creation payload"
fi

# 3. Install dependencies if node_modules is missing
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# 4. Build the client
echo "🏗️  Building client..."
cd client
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Client build failed"
    exit 1
fi
cd ..

# 5. Build the server
echo "🏗️  Building server..."
cd server
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Server build failed"
    exit 1
fi
cd ..

# 6. Deploy to Vercel (frontend)
echo "🚀 Deploying frontend to Vercel..."
npx vercel --prod
if [ $? -ne 0 ]; then
    echo "❌ Vercel deployment failed"
    exit 1
fi

# 7. Deploy to Render (backend)
echo "🚀 Triggering Render deployment..."
# Render auto-deploys on git push, so we just need to push
git push origin main
if [ $? -ne 0 ]; then
    echo "❌ Git push failed"
    exit 1
fi

echo "✅ Deployment completed successfully!"
echo ""
echo "🔍 Fixes Applied:"
echo "  • Fixed prediction creation database schema issue"
echo "  • Added scroll-to-top behavior for all navigation"
echo "  • Improved UX with proper screen transitions"
echo ""
echo "🌐 Frontend: https://fan-club-z.vercel.app"
echo "🔧 Backend: Auto-deploying on Render"
echo ""
echo "⏱️  Please wait 2-3 minutes for both deployments to complete"
