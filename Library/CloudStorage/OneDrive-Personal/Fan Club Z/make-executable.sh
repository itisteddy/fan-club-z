#!/bin/bash

echo "🚀 Making scripts executable..."
chmod +x restart-clean.sh
chmod +x test-production-fixes.mjs

echo "✅ Scripts are now executable!"
echo ""
echo "🔄 To restart the app cleanly:"
echo "   ./restart-clean.sh"
echo ""
echo "🧪 To test fixes manually:"
echo "   node test-production-fixes.mjs"
