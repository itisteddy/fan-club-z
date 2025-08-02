#!/bin/bash

# Fan Club Z - Quick Development Deploy
echo "🛠️ Deploying development to dev environment..."

# Check if we're in the development branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "development" ]; then
    echo "🔄 Switching to development branch..."
    git checkout development
fi

# Quick status check
echo "📊 Current status:"
git status --short

# Add all changes
echo "📁 Adding changes..."
git add .

# Check if there are changes to commit
if git diff --cached --quiet; then
    echo "ℹ️ No changes to commit"
else
    # Commit with timestamp
    COMMIT_MSG="Dev deployment: $(date '+%Y-%m-%d %H:%M')"
    echo "💾 Committing: $COMMIT_MSG"
    git commit -m "$COMMIT_MSG"
fi

# Push to trigger deployment
echo "📤 Pushing to development..."
git push origin development

if [ $? -eq 0 ]; then
    echo "✅ Development deployed successfully!"
    echo "🌐 Dev URL: https://dev.fanclubz.app (or your current Vercel URL)"
    echo "📊 Check status: https://vercel.com/dashboard"
else
    echo "❌ Failed to push development changes"
    exit 1
fi

echo "🎉 Development deployment complete!"