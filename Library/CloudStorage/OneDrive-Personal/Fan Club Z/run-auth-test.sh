#!/bin/bash

# Script to run just the authentication test that was failing

echo "🧪 Running the specific authentication test that was failing..."
echo ""

cd "/Users/efe/Library/CloudStorage/OneDrive-Personal/Fan Club Z/client"

# Run only the specific test that was failing
npx playwright test e2e-tests/comprehensive-features.spec.ts -g "should display login page for unauthenticated users" --headed

echo ""
echo "Test completed!"
