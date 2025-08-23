#!/bin/bash

# Comment System Fix Deployment Script
# Fixes the 404 errors in the comment system

echo "🔧 Fan Club Z - Comment System Fix Deployment"
echo "=============================================="

# Navigate to the project directory
cd "$(dirname "$0")"

echo "📂 Current directory: $(pwd)"

# Install dependencies if needed
echo "📦 Installing/updating dependencies..."
npm install

# Build the project
echo "🏗️  Building the project..."
npm run build

# Check if build was successful
if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
else
    echo "❌ Build failed! Checking for errors..."
    exit 1
fi

echo ""
echo "🧪 Testing comment endpoints..."
echo ""

# Test comment health endpoint
echo "1. Testing comment health endpoint:"
curl -X GET "http://localhost:3001/api/v2/social/health" \
  -H "Content-Type: application/json" \
  -w "\nHTTP Status: %{http_code}\n" \
  -s

echo ""
echo "2. Testing comment test endpoint:"
curl -X GET "http://localhost:3001/api/v2/social/test" \
  -H "Content-Type: application/json" \
  -w "\nHTTP Status: %{http_code}\n" \
  -s

echo ""
echo "3. Testing get comments for prediction:"
curl -X GET "http://localhost:3001/api/v2/social/predictions/test-prediction-id/comments" \
  -H "Content-Type: application/json" \
  -w "\nHTTP Status: %{http_code}\n" \
  -s

echo ""
echo "4. Testing create comment:"
curl -X POST "http://localhost:3001/api/v2/social/predictions/test-prediction-id/comments" \
  -H "Content-Type: application/json" \
  -d '{"content": "Test comment from deployment script"}' \
  -w "\nHTTP Status: %{http_code}\n" \
  -s

echo ""
echo "5. Testing debug storage endpoint:"
curl -X GET "http://localhost:3001/api/v2/social/debug/storage" \
  -H "Content-Type: application/json" \
  -w "\nHTTP Status: %{http_code}\n" \
  -s

echo ""
echo "🚀 Starting development server..."
echo "   - Server will be available at: http://localhost:3001"
echo "   - Frontend will be available at: http://localhost:5173"
echo "   - Comment API base: http://localhost:3001/api/v2/social"
echo ""
echo "💡 To test in browser, open the dev tools console and try:"
echo "   fetch('http://localhost:3001/api/v2/social/health').then(r => r.json()).then(console.log)"
echo ""

# Start the development server
npm run dev
