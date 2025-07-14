#!/bin/bash

echo "🏃 Running bet creation test..."
cd "/Users/efe/Library/CloudStorage/OneDrive-Personal/Fan Club Z/client"
npx playwright test test-bet-creation.mjs --headed
