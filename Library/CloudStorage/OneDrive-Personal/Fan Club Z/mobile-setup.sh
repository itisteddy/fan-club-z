#!/bin/bash

echo "📱 Mobile Development Setup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Get local IP address
if command -v ipconfig &> /dev/null; then
    # Windows
    LOCAL_IP=$(ipconfig | grep "IPv4 Address" | head -1 | awk '{print $NF}')
elif command -v ifconfig &> /dev/null; then
    # macOS/Linux with ifconfig
    LOCAL_IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | head -1 | awk '{print $2}')
else
    # Alternative for Linux
    LOCAL_IP=$(hostname -I | awk '{print $1}')
fi

# Fallback if we couldn't detect IP
if [ -z "$LOCAL_IP" ]; then
    LOCAL_IP="YOUR_COMPUTER_IP"
fi

echo ""
echo "🌐 Your development URLs:"
echo ""
echo "💻 Desktop (localhost):"
echo "   Frontend: http://localhost:3000"
echo "   Backend:  http://localhost:5001"
echo ""
echo "📱 Mobile (network access):"
echo "   Frontend: http://$LOCAL_IP:3000"
echo "   Backend:  http://$LOCAL_IP:5001"
echo ""
echo "🔧 Make sure both devices are on the same WiFi network!"
echo ""
echo "📝 Steps to test on mobile:"
echo "   1. Start the app: npm run dev"
echo "   2. Open mobile browser"
echo "   3. Go to: http://$LOCAL_IP:3000"
echo ""
echo "🔍 To find your IP manually:"
echo "   macOS: ifconfig | grep 'inet '"
echo "   Windows: ipconfig"
echo "   Linux: ip addr show"
