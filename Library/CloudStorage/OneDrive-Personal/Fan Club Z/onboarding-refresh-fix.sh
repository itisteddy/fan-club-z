#!/bin/bash

echo "[FIX] Onboarding & Refresh Issues - Fan Club Z"
echo "============================================"
echo ""

# Navigate to client directory
cd "client" || exit 1

echo "1. [CLEAN] Clearing build caches..."
rm -rf node_modules/.vite
rm -rf dist
rm -rf tsconfig.tsbuildinfo
rm -rf tsconfig.node.tsbuildinfo

echo ""
echo "2. [CHECK] Testing TypeScript compilation..."
npx tsc --noEmit --skipLibCheck

echo ""
echo "3. [INFO] Issues fixed:"
echo "   ✓ Onboarding state persistence improved"
echo "   ✓ Multiple onboarding completion checks added"
echo "   ✓ Token validation made less strict for refresh"
echo "   ✓ Auth state preservation on API errors"
echo "   ✓ Comprehensive localStorage backup systems"
echo ""
echo "4. [START] Starting development server..."
echo ""
echo "[MOBILE] Test these URLs on your mobile device:"
echo "   [MAIN]      http://172.20.3.192:3000"
echo "   [MINIMAL]   http://172.20.3.192:3000/?minimal"
echo "   [EMERGENCY] http://172.20.3.192:3000/emergency.html"
echo ""
echo "[TEST] Steps to verify fixes:"
echo "   1. Login to your account"
echo "   2. Complete onboarding if prompted"
echo "   3. Click on wallet - should work without compliance screens"
echo "   4. Refresh the page - should stay logged in"
echo ""
echo "Press Ctrl+C to stop the server"
echo "============================================"

npm run dev
