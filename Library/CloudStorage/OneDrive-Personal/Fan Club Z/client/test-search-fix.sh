#!/bin/bash

echo "🔍 Testing Search Functionality Fix..."
echo "======================================"

# Check if servers are running
echo "📡 Checking if servers are running..."

# Check frontend
if curl -s http://localhost:3000 > /dev/null; then
    echo "✅ Frontend server running on port 3000"
else
    echo "❌ Frontend server not running on port 3000"
    echo "Please start the frontend server first: npm run dev"
    exit 1
fi

# Check backend
if curl -s http://localhost:8000/health > /dev/null; then
    echo "✅ Backend server running on port 8000"
else
    echo "❌ Backend server not running on port 8000"
    echo "Please start the backend server first"
    exit 1
fi

echo ""
echo "🧪 Running search functionality tests..."

# Run the custom search test
echo "Running custom search test..."
node test-search-functionality.mjs

echo ""
echo "🎭 Running Playwright search tests..."

# Run the Playwright test
npx playwright test e2e-tests/search-functionality.spec.ts --reporter=list

echo ""
echo "✅ Search functionality testing completed!"
