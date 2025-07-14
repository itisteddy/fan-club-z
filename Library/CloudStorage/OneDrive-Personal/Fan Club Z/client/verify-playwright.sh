#!/bin/bash

echo "🔧 Playwright Configuration Verification"
echo "========================================"

# Change to client directory
cd "/Users/efe/Library/CloudStorage/OneDrive-Personal/Fan Club Z/client"

echo "\n📦 Checking Playwright installation..."
npm ls @playwright/test

echo "\n🔍 Testing basic Playwright functionality..."
echo "Running basic test..."
npx playwright test e2e-tests/basic-test.spec.ts --headed

echo "\n🏗️ Testing simple clubs functionality..."
echo "Running simple clubs test..."
npx playwright test e2e-tests/simple-clubs.spec.ts --headed

echo "\n🧪 Testing single comprehensive test..."
echo "Running one test from comprehensive features..."
npx playwright test e2e-tests/comprehensive-features.spec.ts --grep "should display clubs tabs" --headed

echo "\n✅ All test verifications completed!"
