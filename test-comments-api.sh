#!/bin/bash

# Test Comments API Endpoints
# This script tests the fixed comments API to ensure all endpoints are working

echo "🧪 Testing Fan Club Z Comments API Endpoints"
echo "============================================="

# Set the API base URL
API_URL="http://localhost:3001/api/v2/social"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to test an endpoint
test_endpoint() {
    local method=$1
    local endpoint=$2
    local data=$3
    local expected_status=$4
    
    echo -e "\n${YELLOW}Testing: ${method} ${endpoint}${NC}"
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "HTTPSTATUS:%{http_code}" "${API_URL}${endpoint}")
    else
        response=$(curl -s -w "HTTPSTATUS:%{http_code}" -X "${method}" \
            -H "Content-Type: application/json" \
            -d "${data}" \
            "${API_URL}${endpoint}")
    fi
    
    # Extract the status code
    status_code=$(echo $response | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
    response_body=$(echo $response | sed -e 's/HTTPSTATUS:.*//g')
    
    if [ "$status_code" -eq "$expected_status" ]; then
        echo -e "${GREEN}✅ PASS${NC} - Status: $status_code"
        echo "Response: $(echo $response_body | jq '.' 2>/dev/null || echo $response_body)"
    else
        echo -e "${RED}❌ FAIL${NC} - Expected: $expected_status, Got: $status_code"
        echo "Response: $(echo $response_body | jq '.' 2>/dev/null || echo $response_body)"
    fi
}

# Test 1: Health check
test_endpoint "GET" "/health" "" 200

# Test 2: Test route
test_endpoint "GET" "/test" "" 200

# Test 3: Get comments for a prediction (should return empty)
test_prediction_id="test-prediction-123"
test_endpoint "GET" "/predictions/${test_prediction_id}/comments" "" 200

# Test 4: Create a comment
comment_data='{"content":"This is a test comment for API testing"}'
test_endpoint "POST" "/predictions/${test_prediction_id}/comments" "$comment_data" 201

# Test 5: Get comments again (should now have 1 comment)
test_endpoint "GET" "/predictions/${test_prediction_id}/comments" "" 200

# Test 6: Like a comment (will use a mock comment ID)
test_endpoint "POST" "/comments/mock-comment-id/like" "" 200

# Test 7: Debug storage
test_endpoint "GET" "/debug/storage" "" 200

# Test 8: Test unhandled route (should return 404)
test_endpoint "GET" "/nonexistent-route" "" 404

echo -e "\n${YELLOW}📊 API Test Summary${NC}"
echo "================================="
echo "All endpoints have been tested. Check the results above."
echo -e "\n${YELLOW}🔧 Next Steps:${NC}"
echo "1. If any tests fail, check that the server is running"
echo "2. Restart the development server if needed"
echo "3. Check the browser console for resolved errors"

echo -e "\n${YELLOW}🚀 To restart the server:${NC}"
echo "cd server && npm run dev"

echo -e "\n${YELLOW}🌐 To test in browser:${NC}"
echo "Open the Fan Club Z app and try commenting on a prediction"
