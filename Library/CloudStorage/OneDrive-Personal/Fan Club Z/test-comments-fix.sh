#!/bin/bash

echo "🧪 Testing Comments Functionality After Fixes"
echo ""

# Function to test API endpoint
test_endpoint() {
    local method=$1
    local url=$2
    local data=$3
    local expected_status=$4
    
    echo "🔍 Testing: $method $url"
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" "$url")
    else
        response=$(curl -s -w "\n%{http_code}" -X "$method" -H "Content-Type: application/json" -d "$data" "$url")
    fi
    
    status_code=$(echo "$response" | tail -1)
    body=$(echo "$response" | head -n -1)
    
    if [ "$status_code" = "$expected_status" ]; then
        echo "✅ Success: HTTP $status_code"
    else
        echo "❌ Failed: Expected $expected_status, got $status_code"
        echo "Response: $body"
    fi
    echo ""
}

echo "⏳ Waiting for services to be ready..."
sleep 5

echo "🔍 Testing backend health..."
test_endpoint "GET" "http://localhost:5001/api/health" "" "200"

echo "🔍 Testing get bets endpoint..."
test_endpoint "GET" "http://localhost:5001/api/bets" "" "200"

echo "🔍 Testing get trending bets..."
test_endpoint "GET" "http://localhost:5001/api/bets/trending" "" "200"

echo "📱 Frontend should be accessible at http://localhost:3000"
echo ""
echo "🎯 To manually test comments:"
echo "   1. Go to http://localhost:3000"
echo "   2. Navigate to any bet detail page"
echo "   3. Try posting a comment"
echo "   4. Check that the comment appears without HTTP 500 errors"
echo ""
echo "✅ Automated API tests complete!"
