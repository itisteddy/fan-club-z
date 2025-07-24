#!/bin/bash

echo "🛠️ Making scripts executable..."
chmod +x restart-frontend.sh
chmod +x restart-clean.sh 2>/dev/null || true
chmod +x test-production-fixes.mjs 2>/dev/null || true

echo "✅ Scripts are now executable!"
echo ""
echo "🔧 Available commands:"
echo "   ./restart-frontend.sh  - Fix frontend Unicode error and restart"
echo "   ./restart-clean.sh     - Full clean restart (if it exists)"
echo ""
echo "🚀 To fix the current Unicode error:"
echo "   ./restart-frontend.sh"
