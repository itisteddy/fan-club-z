#!/bin/bash

# Quick Fix Deployment - Prediction Creation Database Schema Issue
echo "🚨 URGENT: Deploying prediction creation database fix..."

# Check if we're in the project root
if [ ! -f "package.json" ]; then
    echo "❌ Error: Not in project root directory"
    exit 1
fi

# Add and commit the emergency fix
echo "📝 Committing emergency database schema fix..."
git add .
git commit -m "URGENT: Fix prediction creation database schema

- Remove participant_count field that doesn't exist in production DB
- Remove manual timestamp fields (handled by DB triggers)
- Clean up prediction payload to match actual DB schema
- Fix prediction options creation payload"

# Push to trigger auto-deployment
echo "🚀 Pushing to trigger auto-deployment..."
git push origin main

echo "✅ Emergency fix deployed!"
echo ""
echo "🔍 Changes Applied:"
echo "  • Removed participant_count from prediction payload"
echo "  • Removed manual timestamp fields"
echo "  • Fixed prediction options creation"
echo "  • Cleaned up payload to match production DB schema"
echo ""
echo "⏱️  Render will auto-deploy in ~2-3 minutes"
echo "🌐 Test at: https://fan-club-z.vercel.app"
