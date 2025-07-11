#!/bin/bash

# E2E Test Runner for Fan Club Z
# This script runs comprehensive end-to-end tests for the betting platform

set -e

echo "🧪 Starting E2E Tests for Fan Club Z"
echo "======================================"

# Check if frontend is running
if ! curl -s http://localhost:3000 > /dev/null; then
    echo "❌ Frontend is not running on http://localhost:3000"
    echo "Please start the frontend with: cd client && npm run dev"
    exit 1
fi

# Check if backend is running
if ! curl -s http://localhost:5001/api/health > /dev/null; then
    echo "❌ Backend is not running on http://localhost:5001"
    echo "Please start the backend with: cd server && npm run dev"
    exit 1
fi

echo "✅ Frontend and backend are running"

# Install Playwright if not already installed
if ! npx playwright --version > /dev/null 2>&1; then
    echo "📦 Installing Playwright..."
    npx playwright install
fi

# Create test results directory
mkdir -p test-results

echo "🚀 Running E2E Tests..."
echo "========================"

# Run the tests with detailed output
npx playwright test tests/e2e/bet-detail-navigation.test.ts \
    --reporter=list \
    --timeout=30000 \
    --retries=2 \
    --output-dir=test-results

echo ""
echo "📊 Test Results Summary"
echo "========================"

# Check if tests passed
if [ $? -eq 0 ]; then
    echo "✅ All E2E tests passed!"
    echo ""
    echo "🎉 Bet Detail Page fixes verified:"
    echo "  ✓ Back button navigation works correctly"
    echo "  ✓ Comment input is disabled for unauthenticated users"
    echo "  ✓ Comments persist for authenticated users"
    echo "  ✓ Bet placement updates My Bets screen"
    echo "  ✓ Correct tab highlighting in bottom navigation"
    echo ""
    echo "🚀 Ready for production testing!"
else
    echo "❌ Some E2E tests failed"
    echo "Check test-results/ for detailed reports"
    exit 1
fi 