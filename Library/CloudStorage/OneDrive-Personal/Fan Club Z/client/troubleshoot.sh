#!/bin/bash

echo "🔧 Fan Club Z - Troubleshooting Guide"
echo "======================================"

echo -e "\n1️⃣ Checking if servers are running..."

# Check if frontend is running
if curl -s http://localhost:3000 > /dev/null; then
    echo "✅ Frontend (port 3000) is responding"
else
    echo "❌ Frontend (port 3000) is NOT responding"
    echo "   Run: cd client && npm run dev"
fi

# Check if backend is running
if curl -s http://localhost:3001/api/health > /dev/null; then
    echo "✅ Backend (port 3001) is responding"
else
    echo "❌ Backend (port 3001) is NOT responding"
    echo "   Run: cd server && npm run dev"
fi

echo -e "\n2️⃣ Running server health check..."
cd "/Users/efe/Library/CloudStorage/OneDrive-Personal/Fan Club Z/client"
node check-servers.mjs

echo -e "\n3️⃣ Running comprehensive app flow diagnosis..."
echo "This will open a browser window for manual inspection..."
node diagnose-app-flow.mjs

echo -e "\n4️⃣ Running minimal Playwright test..."
npx playwright test e2e-tests/debug-minimal.spec.ts --headed --timeout=60000

echo -e "\n5️⃣ Checking for any obvious issues..."

# Check if there are any syntax errors in the main files
echo "Checking for syntax errors..."

if node -c /Users/efe/Library/CloudStorage/OneDrive-Personal/Fan\ Club\ Z/client/src/App.tsx 2>/dev/null; then
    echo "✅ App.tsx syntax is valid"
else
    echo "❌ App.tsx has syntax errors"
fi

echo -e "\n✅ Troubleshooting guide completed!"
echo "Check the screenshots and browser console for more details."
