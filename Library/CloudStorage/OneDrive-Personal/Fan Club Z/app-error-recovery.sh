#!/bin/bash

# Make this script executable
chmod +x "$0"

echo "🚨 App Error Recovery Script"
echo "============================"

echo "The app is showing an error page. Let's diagnose and fix this:"
echo ""

echo "🔧 Quick Fix Options:"
echo "   1. Try reloading the app (click 'Reload App' button)"
echo "   2. Clear auth data (click 'Clear Auth & Restart' button)"
echo "   3. Clear all data (click 'Clear All Data & Restart' button)"

echo ""
echo "📱 Manual Recovery Steps:"
echo "   1. Open browser DevTools (F12 on desktop, Safari: Develop menu)"
echo "   2. Go to Console tab"
echo "   3. Look for error messages (red text)"
echo "   4. Try this manual fix:"

echo ""
echo "🛠️ Manual Fix Commands (paste in browser console):"
echo "   // Clear auth data:"
echo "   localStorage.removeItem('fan-club-z-auth')"
echo "   localStorage.removeItem('auth_token')"
echo "   localStorage.removeItem('accessToken')"
echo "   localStorage.removeItem('refreshToken')"
echo "   window.location.href = '/'"

echo ""
echo "🚀 If error persists:"
echo "   1. Stop the servers (Ctrl+C)"
echo "   2. Restart with: ./mobile-dev.sh"
echo "   3. Try accessing: http://[YOUR_IP]:3000/mobile-test.html"

echo ""
echo "🐛 Common Error Causes:"
echo "   - Recent auth store changes causing React hook issues"
echo "   - localStorage corruption or full storage"
echo "   - Network connectivity issues"
echo "   - JavaScript syntax errors in recent changes"

echo ""
echo "✅ Expected Fix Result:"
echo "   After clearing auth data, you should be able to:"
echo "   - Access the registration/login page"
echo "   - Complete the onboarding flow again"
echo "   - Reach the main app without errors"
