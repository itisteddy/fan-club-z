#!/bin/bash

echo "🔧 Making all scripts executable..."
chmod +x diagnose-blank-page.sh
chmod +x fix-app-issues.sh

echo ""
echo "✅ All scripts are now executable!"
echo ""
echo "🎯 To fix the blank page issue, run:"
echo "   ./diagnose-blank-page.sh"
echo ""
echo "📱 Then test these URLs on your mobile device:"
echo "   • Main app: http://172.20.3.192:3000"
echo "   • Test page: http://172.20.3.192:3000/test.html"
echo "   • Minimal React: http://172.20.3.192:3000/?minimal"
echo "   • Debug mode: http://172.20.3.192:3000/?test"
echo ""
echo "🛠️ If issues persist, also try:"
echo "   ./fix-app-issues.sh"
