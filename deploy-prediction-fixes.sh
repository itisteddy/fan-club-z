#!/bin/bash

echo "🚀 Deploying prediction fixes to Render..."

# Add all changes
echo "📝 Adding changes to git..."
git add .

# Commit with descriptive message
echo "💾 Committing changes..."
git commit -m "FIX: Prediction cards rendering - Real database integration - Enhanced CORS configuration - Version 2.0.47 - Database seeding endpoint - Sample prediction data ready"

# Push to main branch
echo "📤 Pushing to main branch..."
git push origin main

echo "✅ Deployment triggered!"
echo ""
echo "⏳ Please wait 2-3 minutes for Render deployment to complete."
echo "🔗 Monitor deployment at: https://dashboard.render.com/web/srv-xxx"
echo ""
echo "📋 Next steps:"
echo "1. Wait for deployment to complete"
echo "2. Run: ./seed-database.sh"
echo "3. Test frontend: https://app.fanclubz.app"
