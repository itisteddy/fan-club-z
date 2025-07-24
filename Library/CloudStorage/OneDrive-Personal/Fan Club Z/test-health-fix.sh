#!/bin/bash

echo "🧪 Testing Health Endpoint Fix"
echo "==============================\n"

echo "1️⃣ Testing backend health endpoint..."
HEALTH_RESPONSE=$(curl -s -w "%{http_code}" http://localhost:5001/api/health)
HTTP_CODE="${HEALTH_RESPONSE: -3}"
RESPONSE_BODY="${HEALTH_RESPONSE%???}"

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Health endpoint working! HTTP $HTTP_CODE"
    echo "   Response: $RESPONSE_BODY"
else
    echo "❌ Health endpoint failed! HTTP $HTTP_CODE"
    echo "   Response: $RESPONSE_BODY"
fi

echo "\n2️⃣ Testing frontend health check..."
# Test the frontend's health check logic
FRONTEND_HEALTH=$(curl -s -w "%{http_code}" http://localhost:3000/api/health)
FRONTEND_CODE="${FRONTEND_HEALTH: -3}"

if [ "$FRONTEND_CODE" = "200" ]; then
    echo "✅ Frontend proxy working! HTTP $FRONTEND_CODE"
else
    echo "❌ Frontend proxy failed! HTTP $FRONTEND_CODE"
fi

echo "\n3️⃣ Summary:"
if [ "$HTTP_CODE" = "200" ] && [ "$FRONTEND_CODE" = "200" ]; then
    echo "✅ Issue #3 RESOLVED!"
    echo "   - Backend health endpoint: Working"
    echo "   - Frontend proxy: Working"
    echo "   - Connection status should show: Connected"
    echo "\n🎉 Ready to test login functionality!"
else
    echo "❌ Issue #3 NOT resolved"
    echo "   - Check that both servers are running"
    echo "   - Verify the health endpoint fix was applied"
    echo "   - Run: ./fix-health-endpoint.sh"
fi
