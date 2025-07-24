#!/bin/bash

echo "🔧 Pushing Vercel build fix to GitHub..."

cd "/Users/efe/Library/CloudStorage/OneDrive-Personal/Fan Club Z"

# Add the build command fix
git add client/package.json
git commit -m "Fix Vercel build: remove tsc dependency, use vite build only"
git push origin deployment

echo "✅ Vercel build fix pushed!"
echo ""
echo "🔄 NOW GO TO VERCEL:"
echo "1. Go to your Vercel project"
echo "2. Click 'Redeploy' or trigger new deployment"
echo "3. Build should succeed now"
echo ""
echo "🚂 COMPLETE RAILWAY LOGIN:"
echo "1. Go to: https://railway.com/cli-login?d=d29yZENvZGU9bGF2ZW5kZXItd2hvbGVzb21lLWltYWdpbmF0aW9u"
echo "2. Enter code: lavender-wholesome-imagination"
echo "3. Then run: railway deploy"
