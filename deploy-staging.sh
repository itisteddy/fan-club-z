#!/bin/bash

# Fan Club Z - Deploy to Staging
echo "🚀 Deploying Fan Club Z to staging..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Make sure you're in the project root."
    exit 1
fi

# Stash any uncommitted changes
echo "💾 Stashing uncommitted changes..."
git stash push -m "Auto-stash before staging deployment $(date)"

# Switch to staging branch
echo "🔄 Switching to staging branch..."
git checkout staging

# Merge latest development
echo "🔀 Merging development into staging..."
git merge development --no-edit

if [ $? -ne 0 ]; then
    echo "❌ Merge conflicts detected. Please resolve manually."
    exit 1
fi

# Run tests to ensure stability
echo "🧪 Running tests..."
npm run test

if [ $? -ne 0 ]; then
    echo "❌ Tests failed. Deployment cancelled."
    exit 1
fi

# Build to verify everything works
echo "🏗️ Building project..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed. Deployment cancelled."
    exit 1
fi

# Push to trigger deployment
echo "📤 Pushing to staging..."
git push origin staging

if [ $? -eq 0 ]; then
    echo "✅ Staging deployment triggered successfully!"
    echo "🌐 Staging URL: https://staging.fanclubz.app"
    echo "📊 Monitor deployment: https://vercel.com/dashboard"
else
    echo "❌ Failed to push to staging branch"
    exit 1
fi

# Switch back to development
git checkout development

# Pop stashed changes if any
if git stash list | grep -q "Auto-stash before staging deployment"; then
    echo "📂 Restoring stashed changes..."
    git stash pop
fi

echo "🎉 Staging deployment complete!"