#!/bin/bash

echo "🧪 Testing specific club features that were updated..."

# Test individual club tests
echo "\n📋 Testing: should show club categories"
npx playwright test e2e-tests/comprehensive-features.spec.ts --grep "should show club categories" --headed --timeout=60000

echo "\n📋 Testing: should allow creating a club" 
npx playwright test e2e-tests/comprehensive-features.spec.ts --grep "should allow creating a club" --headed --timeout=60000

echo "\n📋 Testing: should allow joining clubs"
npx playwright test e2e-tests/comprehensive-features.spec.ts --grep "should allow joining clubs" --headed --timeout=60000

echo "\n📋 Testing: should navigate to club detail page"
npx playwright test e2e-tests/comprehensive-features.spec.ts --grep "should navigate to club detail page" --headed --timeout=60000

echo "\n📋 Testing: should show club statistics"
npx playwright test e2e-tests/comprehensive-features.spec.ts --grep "should show club statistics" --headed --timeout=60000

echo "\n📋 Testing: should show club members"
npx playwright test e2e-tests/comprehensive-features.spec.ts --grep "should show club members" --headed --timeout=60000

echo "\n🏁 All club tests completed!"
