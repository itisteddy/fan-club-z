#!/bin/bash

echo "🧪 Running Navigation Tests..."
echo "================================"

cd "$(dirname "$0")"

# Check if servers are running
echo "🔍 Checking server status..."

FRONTEND_PID=$(lsof -ti:3000)
BACKEND_PID=$(lsof -ti:3001)

if [ -z "$FRONTEND_PID" ]; then
    echo "❌ Frontend server not running on port 3000"
    echo "🚀 Starting frontend server..."
    npm run dev &
    sleep 5
else
    echo "✅ Frontend server running (PID: $FRONTEND_PID)"
fi

if [ -z "$BACKEND_PID" ]; then
    echo "❌ Backend server not running on port 3001"
    echo "🚀 Please start the backend server in another terminal:"
    echo "   cd ../server && npm start"
else
    echo "✅ Backend server running (PID: $BACKEND_PID)"
fi

echo ""
echo "🎯 Running comprehensive navigation tests..."
echo ""

# Run the comprehensive navigation test
npx playwright test e2e-tests/navigation-comprehensive.spec.ts --headed --project=chromium

echo ""
echo "📊 Test Results:"
echo "- Check the test output above for detailed results"
echo "- Screenshots saved in current directory"
echo "- Any failures will be reported with specific details"
echo ""
echo "🔧 If tests fail, check:"
echo "1. Both frontend (3000) and backend (3001) servers are running"
echo "2. No console errors in browser"
echo "3. Navigation component is properly rendered"
echo "4. Authentication flow is working"
echo ""
