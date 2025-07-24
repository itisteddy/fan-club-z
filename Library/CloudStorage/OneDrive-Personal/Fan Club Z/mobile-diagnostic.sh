#!/bin/bash

# Fan Club Z - Mobile Diagnostic Script
# This script checks if the mobile setup is working correctly

echo "📱 Fan Club Z Mobile Diagnostic"
echo "==============================="

# Get the local IP address (try multiple interfaces)
LOCAL_IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || ipconfig getifaddr wlan0 2>/dev/null || ipconfig getifaddr eth0 2>/dev/null || echo "172.20.2.210")
echo "🌐 Local IP: $LOCAL_IP"

# Check if servers are running
echo ""
echo "🔍 Checking server status..."

# Check backend
if curl -s "http://localhost:3001/health" > /dev/null; then
    echo "✅ Backend server is running on localhost:3001"
else
    echo "❌ Backend server is NOT running on localhost:3001"
fi

if curl -s "http://$LOCAL_IP:3001/health" > /dev/null; then
    echo "✅ Backend server is accessible from network at $LOCAL_IP:3001"
else
    echo "❌ Backend server is NOT accessible from network at $LOCAL_IP:3001"
fi

# Check frontend
if curl -s "http://localhost:3000" > /dev/null; then
    echo "✅ Frontend server is running on localhost:3000"
else
    echo "❌ Frontend server is NOT running on localhost:3000"
fi

if curl -s "http://$LOCAL_IP:3000" > /dev/null; then
    echo "✅ Frontend server is accessible from network at $LOCAL_IP:3000"
else
    echo "❌ Frontend server is NOT accessible from network at $LOCAL_IP:3000"
fi

echo ""
echo "📱 Mobile Access Instructions:"
echo "1. Make sure your phone is on the same WiFi network as this computer"
echo "2. Open Safari on your phone"
echo "3. Test connection: http://$LOCAL_IP:3000/mobile-test.html"
echo "4. If test passes, navigate to: http://$LOCAL_IP:3000"
echo "5. If you see an error, try: http://$LOCAL_IP:3001/health (should show server info)"

echo ""
echo "🔧 If mobile access doesn't work:"
echo "1. Check your firewall settings"
echo "2. Make sure both devices are on the same WiFi network"
echo "3. Try restarting both servers with: ./mobile-dev.sh"
