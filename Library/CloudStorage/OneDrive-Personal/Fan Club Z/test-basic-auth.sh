#!/bin/bash

echo "🧪 Running basic authentication test..."

cd "/Users/efe/Library/CloudStorage/OneDrive-Personal/Fan Club Z/client"

# Run the basic test
npx playwright test basic-auth.spec.ts --reporter=list --headed

echo "✅ Test completed!"
