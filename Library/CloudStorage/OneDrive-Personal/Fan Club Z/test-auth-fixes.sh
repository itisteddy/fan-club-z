#!/bin/bash

echo "🧪 Running the first two authentication tests..."

cd "/Users/efe/Library/CloudStorage/OneDrive-Personal/Fan Club Z/client"

echo "Test 1: Login page display"
npx playwright test --grep "should display login page for unauthenticated users" --reporter=list

echo ""
echo "Test 2: Demo login"
npx playwright test --grep "should allow demo login" --reporter=list

echo "✅ Authentication tests completed!"
