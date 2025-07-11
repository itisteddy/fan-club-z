#!/bin/bash

# Navigate to client directory
cd "/Users/efe/Library/CloudStorage/OneDrive-Personal/Fan Club Z/client"

# Run the specific failing test
echo "Running specific authentication test..."
npx playwright test --grep "should display login page for unauthenticated users" --reporter=list
