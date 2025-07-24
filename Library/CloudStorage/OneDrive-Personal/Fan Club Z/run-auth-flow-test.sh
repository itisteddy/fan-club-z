#!/bin/bash

echo "🧪 Making test script executable..."
chmod +x test-registration-onboarding-flow.mjs
chmod +x run-auth-flow-test.sh

echo "🚀 Running authentication flow test..."
echo "This will test the registration and onboarding flow to verify the fix"
echo ""

# Check if the app is running
if curl -s http://localhost:5173 > /dev/null; then
    echo "✅ App is running on localhost:5173"
    echo "🧪 Starting test..."
    node test-registration-onboarding-flow.mjs
else
    echo "❌ App is not running on localhost:5173"
    echo "Please start the app first with:"
    echo "  cd client && npm run dev"
    echo ""
    echo "Then run this script again."
fi
