#!/bin/bash

# Deploy Comments Fix Script
# This script rebuilds and restarts the server with comment system fixes

echo "🚀 Deploying Comment System Fixes..."

# Navigate to server directory
cd server

echo "📦 Installing dependencies..."
npm install

echo "🔨 Building TypeScript..."
npm run build

echo "🗃️ Testing comment API endpoints..."
echo "Testing comments health endpoint..."
curl -X GET "http://localhost:3001/api/v2/comments/health" || echo "Server not running locally"

echo "✅ Comment system fixes deployed!"
echo "🔄 Please restart your development server:"
echo "   cd server && npm run dev"
echo ""
echo "🧪 Test the comment system by:"
echo "   1. Open your browser to localhost:5173"
echo "   2. Navigate to any prediction"  
echo "   3. Try posting a comment"
echo "   4. Check the console for successful API calls"
echo ""
echo "📊 Available comment endpoints:"
echo "   - GET /api/v2/comments/health"
echo "   - GET /api/v2/comments/predictions/:predictionId/comments" 
echo "   - POST /api/v2/comments/predictions/:predictionId/comments"
echo "   - GET /api/v2/social/predictions/:predictionId/comments"
echo "   - POST /api/v2/social/predictions/:predictionId/comments"
