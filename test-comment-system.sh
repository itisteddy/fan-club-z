#!/bin/bash

# Diagnostic script to test the comment system
echo "🔍 Comment System Diagnostics"
echo "============================"

# Test if server is running
echo ""
echo "1. Testing server health..."
if curl -s http://localhost:3001/health > /dev/null; then
    echo "✅ Server is running on port 3001"
    curl -s http://localhost:3001/health | jq '.' 2>/dev/null || curl -s http://localhost:3001/health
else
    echo "❌ Server is not responding on port 3001"
    echo "   Make sure the server is running with: npm run dev:server"
    exit 1
fi

# Test comment routes
echo ""
echo "2. Testing comment test route..."
if curl -s http://localhost:3001/api/test > /dev/null; then
    echo "✅ Comment test route is accessible"
    curl -s http://localhost:3001/api/test | jq '.' 2>/dev/null || curl -s http://localhost:3001/api/test
else
    echo "❌ Comment test route failed"
    echo "   This indicates routing issues"
fi

# Test specific prediction comments endpoint
echo ""
echo "3. Testing prediction comments endpoint..."
PREDICTION_ID="d7d1ac22-de45-4931-8ea8-611bfa5e9649"
if curl -s "http://localhost:3001/api/predictions/${PREDICTION_ID}/comments" > /dev/null; then
    echo "✅ Prediction comments endpoint is accessible"
    curl -s "http://localhost:3001/api/predictions/${PREDICTION_ID}/comments" | jq '.' 2>/dev/null || curl -s "http://localhost:3001/api/predictions/${PREDICTION_ID}/comments"
else
    echo "❌ Prediction comments endpoint failed"
    echo "   URL: http://localhost:3001/api/predictions/${PREDICTION_ID}/comments"
fi

# Test POST endpoint
echo ""
echo "4. Testing comment creation..."
RESPONSE=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -d '{"content":"Test comment from diagnostic script"}' \
  "http://localhost:3001/api/predictions/${PREDICTION_ID}/comments")

if [ $? -eq 0 ]; then
    echo "✅ POST request successful"
    echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
else
    echo "❌ POST request failed"
fi

echo ""
echo "5. Server logs check..."
echo "Check your server console for any error messages."
echo "If you see route registration logs, the routes are loaded correctly."

echo ""
echo "🎯 Next steps if tests fail:"
echo "1. Ensure server is running: npm run dev:server"
echo "2. Check server logs for errors"
echo "3. Verify the database migration was applied"
echo "4. Check browser Network tab for exact error details"
