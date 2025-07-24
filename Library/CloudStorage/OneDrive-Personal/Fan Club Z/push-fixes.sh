#!/bin/bash

echo "🔧 Pushing Railway deployment fixes..."

# Navigate to project root
cd "/Users/efe/Library/CloudStorage/OneDrive-Personal/Fan Club Z"

# Add the fixed files
git add .
git commit -m "Fix Railway deployment configuration and server build paths"
git push origin deployment

echo "✅ Railway fixes pushed to GitHub!"
echo ""
echo "🚂 NOW IN RAILWAY:"
echo "1. Delete the current failed deployment"
echo "2. Create New Project → Deploy from GitHub"
echo "3. IMPORTANT: Set Root Directory to 'server'"
echo "4. Add environment variables from .env.production"
echo ""
echo "⚡ IF VERCEL IS STILL STUCK:"
echo "Try: cd client && npm i -g vercel && vercel --prod"
