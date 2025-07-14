#!/bin/bash

echo "🚀 Running Profile Page Debug Test..."

cd "/Users/efe/Library/CloudStorage/OneDrive-Personal/Fan Club Z/client"

# Run the comprehensive profile test
npx playwright test test-profile-comprehensive.mjs --headed=false --reporter=line

echo "✅ Profile test completed!"
echo "📸 Check profile-comprehensive-debug.png for visual results"
