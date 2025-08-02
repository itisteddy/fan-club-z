#!/bin/bash

# Fan Club Z - Deploy to Production
echo "🎯 Fan Club Z - Production Deployment"

# Safety check
echo "⚠️  WARNING: You are about to deploy to PRODUCTION (fanclubz.app)"
echo "This will be accessible to all users."
echo ""
read -p "Are you sure you want to continue? (yes/no): " confirm

if [[ $confirm != "yes" ]]; then
    echo "❌ Production deployment cancelled"
    exit 1
fi

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Make sure you're in the project root."
    exit 1
fi

# Stash any uncommitted changes
echo "💾 Stashing uncommitted changes..."
git stash push -m "Auto-stash before production deployment $(date)"

# Switch to main branch
echo "🔄 Switching to main branch..."
git checkout main

# Merge staging (only tested code goes to production)
echo "🔀 Merging staging into main..."
git merge staging --no-edit

if [ $? -ne 0 ]; then
    echo "❌ Merge conflicts detected. Please resolve manually."
    exit 1
fi

# Final tests before production
echo "🧪 Running final tests..."
npm run test

if [ $? -ne 0 ]; then
    echo "❌ Tests failed. Production deployment cancelled."
    exit 1
fi

# Production build verification
echo "🏗️ Building for production..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Production build failed. Deployment cancelled."
    exit 1
fi

# Create production tag
echo "🏷️ Creating production tag..."
TIMESTAMP=$(date +"%Y%m%d-%H%M%S")
TAG="prod-$TIMESTAMP"
git tag -a $TAG -m "Production deployment $TIMESTAMP"

# Push to trigger deployment  
echo "📤 Pushing to production..."
git push origin main
git push origin $TAG

if [ $? -eq 0 ]; then
    echo "✅ Production deployment triggered successfully!"
    echo ""
    echo "🌐 Production URL: https://fanclubz.app"
    echo "🏷️ Tagged as: $TAG"
    echo "📊 Monitor deployment: https://vercel.com/dashboard"
    echo ""
    echo "🚨 Post-deployment checklist:"
    echo "   □ Test key user flows"
    echo "   □ Check error monitoring"
    echo "   □ Verify performance metrics"
    echo "   □ Monitor user feedback"
else
    echo "❌ Failed to push to main branch"
    exit 1
fi

# Switch back to development
git checkout development

# Pop stashed changes if any
if git stash list | grep -q "Auto-stash before production deployment"; then
    echo "📂 Restoring stashed changes..."
    git stash pop
fi

echo "🎉 Production deployment complete!"
echo "💡 Tip: Keep monitoring for the next 30 minutes"