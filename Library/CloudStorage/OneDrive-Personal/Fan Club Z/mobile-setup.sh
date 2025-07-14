#!/bin/bash

echo "📱 Fan Club Z - Mobile Testing Setup"
echo "===================================="
echo ""

# Get local IP address
LOCAL_IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -1)
echo "🌐 Your Local IP Address: $LOCAL_IP"
echo ""

# Check if services are running
echo "🔍 Checking service status..."
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ Frontend: http://localhost:3000 (Local)"
    echo "✅ Frontend: http://$LOCAL_IP:3000 (Mobile)"
else
    echo "❌ Frontend not running on port 3000"
fi

if curl -s http://localhost:3001/health > /dev/null 2>&1; then
    echo "✅ Backend: http://localhost:3001 (Local)"
    echo "✅ Backend: http://$LOCAL_IP:3001 (Mobile)"
else
    echo "❌ Backend not running on port 3001"
fi

echo ""
echo "📱 Mobile Testing Instructions:"
echo "==============================="
echo ""
echo "1. 📱 Connect your mobile device to the same WiFi network as this computer"
echo ""
echo "2. 🌐 Open your mobile browser and navigate to:"
echo "   http://$LOCAL_IP:3000"
echo ""
echo "3. 🔐 Test the following features:"
echo "   - Login page display"
echo "   - Demo login functionality"
echo "   - Navigation between tabs"
echo "   - Bet cards display"
echo "   - Profile page"
echo "   - Wallet functionality"
echo "   - Club management"
echo ""
echo "4. 📊 Test Responsive Design:"
echo "   - Portrait and landscape orientations"
echo "   - Different screen sizes"
echo "   - Touch interactions"
echo "   - Swipe gestures"
echo ""
echo "5. 🔧 Troubleshooting:"
echo "   - If connection fails, check firewall settings"
echo "   - Ensure both devices are on same network"
echo "   - Try refreshing the page if it doesn't load"
echo ""
echo "6. 📱 Mobile-Specific Testing:"
echo "   - Test on Safari (iOS) and Chrome (Android)"
echo "   - Check for any mobile-specific UI issues"
echo "   - Verify touch targets are large enough (44px minimum)"
echo "   - Test with different network conditions"
echo ""
echo "🚀 Happy Mobile Testing!"
echo ""
echo "💡 Pro Tip: Use browser dev tools to simulate mobile devices for quick testing"
