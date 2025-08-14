#!/bin/bash

echo "🔍 WebSocket Diagnostic Check"
echo "============================="

echo "📋 Environment Check:"
echo "   Node.js: $(node --version 2>/dev/null || echo 'Not found')"
echo "   npm: $(npm --version 2>/dev/null || echo 'Not found')"
echo ""

echo "📂 Project Structure:"
if [ -f "package.json" ]; then
    echo "   ✅ Root package.json found"
else
    echo "   ❌ Root package.json missing"
fi

if [ -f "server/package.json" ]; then
    echo "   ✅ Server package.json found"
else
    echo "   ❌ Server package.json missing"
fi

if [ -f "client/package.json" ]; then
    echo "   ✅ Client package.json found"
else
    echo "   ❌ Client package.json missing"
fi

echo ""
echo "🌐 Port Status:"
SERVER_PORT_CHECK=$(lsof -i :3001 2>/dev/null | wc -l)
CLIENT_PORT_CHECK=$(lsof -i :5173 2>/dev/null | wc -l)

if [ $SERVER_PORT_CHECK -gt 0 ]; then
    echo "   📡 Port 3001: OCCUPIED"
    lsof -i :3001 | head -2
else
    echo "   📡 Port 3001: Available"
fi

if [ $CLIENT_PORT_CHECK -gt 0 ]; then
    echo "   🌐 Port 5173: OCCUPIED" 
    lsof -i :5173 | head -2
else
    echo "   🌐 Port 5173: Available"
fi

echo ""
echo "📄 Configuration Files:"
if [ -f "client/.env.local" ]; then
    echo "   ✅ Client .env.local exists"
    echo "   📝 VITE_API_URL: $(grep VITE_API_URL client/.env.local 2>/dev/null || echo 'Not set')"
else
    echo "   ⚠️  Client .env.local missing"
fi

if [ -f "server/.env" ]; then
    echo "   ✅ Server .env exists"
else
    echo "   ⚠️  Server .env missing"
fi

if [ -f ".env.local" ]; then
    echo "   ✅ Root .env.local exists"
    echo "   📝 PORT: $(grep '^PORT=' .env.local 2>/dev/null || echo 'Not set')"
else
    echo "   ⚠️  Root .env.local missing"
fi

echo ""
echo "🔧 Key Files Check:"
if [ -f "server/src/app.ts" ]; then
    echo "   ✅ server/src/app.ts exists"
    if grep -q "createServer" server/src/app.ts; then
        echo "      ✅ Uses createServer (Fixed)"
    else
        echo "      ❌ Missing createServer (Needs fix)"
    fi
else
    echo "   ❌ server/src/app.ts missing"
fi

if [ -f "server/src/services/ChatService.ts" ]; then
    echo "   ✅ ChatService.ts exists"
    if grep -q "HttpServer" server/src/services/ChatService.ts; then
        echo "      ✅ Accepts HttpServer (Fixed)"
    else
        echo "      ❌ Wrong constructor (Needs fix)"
    fi
else
    echo "   ❌ ChatService.ts missing"
fi

if [ -f "client/src/store/chatStore.ts" ]; then
    echo "   ✅ chatStore.ts exists"
    if grep -q "localhost:3001" client/src/store/chatStore.ts; then
        echo "      ✅ Correct default port (Fixed)"
    else
        echo "      ❌ Wrong default port (Needs fix)"
    fi
else
    echo "   ❌ chatStore.ts missing"
fi

echo ""
echo "🏥 Health Check:"
if curl -s http://localhost:3001/health > /dev/null 2>&1; then
    echo "   ✅ Server responding on port 3001"
    curl -s http://localhost:3001/health | grep -o '"status":"[^"]*"' || echo "   📡 Server status available"
else
    echo "   ❌ Server not responding on port 3001"
fi

echo ""
echo "💡 Recommendations:"
if [ $SERVER_PORT_CHECK -eq 0 ] && [ $CLIENT_PORT_CHECK -eq 0 ]; then
    echo "   🚀 Ports are free - ready to start services"
    echo "   📝 Run: ./complete-websocket-fix.sh"
elif [ $SERVER_PORT_CHECK -gt 0 ] || [ $CLIENT_PORT_CHECK -gt 0 ]; then
    echo "   🛑 Stop existing services first:"
    echo "   📝 pkill -f 'vite.*5173' && pkill -f 'tsx.*server'"
    echo "   📝 Then run: ./complete-websocket-fix.sh"
fi

echo ""
echo "🧪 Quick Test Commands:"
echo "   📡 Test server: curl http://localhost:3001/health"
echo "   🌐 Test client: curl http://localhost:5173"
echo "   🔌 Test WebSocket: node -e \"require('socket.io-client')('http://localhost:3001')\""
