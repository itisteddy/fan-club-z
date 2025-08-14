#!/bin/bash

echo "🔧 Chat WebSocket Connection - Complete Fix"
echo "=========================================="

# Kill any existing processes on ports 3001 and 5173
echo "🛑 Stopping existing processes..."
lsof -ti:3001 | xargs kill -9 2>/dev/null || true
lsof -ti:5173 | xargs kill -9 2>/dev/null || true
sleep 3

echo "✅ Fixed Issues:"
echo "   1. ChatService now accepts HTTP server instead of Express app"
echo "   2. App.ts creates HTTP server and passes it to ChatService"
echo "   3. Fixed Socket.IO initialization with proper server instance"
echo ""

# Option to use minimal server for testing
read -p "🤔 Use minimal test server? (y/n): " use_minimal

if [ "$use_minimal" = "y" ] || [ "$use_minimal" = "Y" ]; then
    echo "🧪 Starting minimal test server..."
    cd server
    npx tsx src/index-minimal.ts &
    SERVER_PID=$!
    cd ..
    echo "📡 Minimal server started (PID: $SERVER_PID)"
else
    echo "🖥️  Starting full server..."
    cd server
    npm run dev &
    SERVER_PID=$!
    cd ..
    echo "📡 Full server started (PID: $SERVER_PID)"
fi

# Wait for server to start
echo "⏳ Waiting for server to start..."
sleep 8

# Check server health
if curl -s http://localhost:3001/health > /dev/null; then
    echo "✅ Server is healthy on port 3001"
    echo "📊 Server status:"
    curl -s http://localhost:3001/health | python3 -m json.tool 2>/dev/null || echo "Health endpoint responding"
else
    echo "❌ Server health check failed"
    echo "📋 Server logs:"
    ps aux | grep "3001\|tsx\|node" | grep -v grep
    kill $SERVER_PID 2>/dev/null || true
    exit 1
fi

# Start client
echo ""
echo "🌐 Starting client..."
cd client
npm run dev &
CLIENT_PID=$!
cd ..

# Wait for client
echo "⏳ Waiting for client to start..."
sleep 8

echo ""
echo "✅ Setup Complete!"
echo ""
echo "📊 Services Running:"
echo "   🖥️  Server: http://localhost:3001 (PID: $SERVER_PID)"
echo "   🌐 Client: http://localhost:5173 (PID: $CLIENT_PID)"
echo ""
echo "🧪 Testing Steps:"
echo "   1. Open http://localhost:5173"
echo "   2. Navigate to any prediction"
echo "   3. Open browser console (F12)"
echo "   4. Look for: '✅ WebSocket connected successfully!'"
echo "   5. Try accessing a discussion"
echo ""
echo "🔍 Manual Test:"
echo "   In browser console, run:"
echo "   testSocket = io('http://localhost:3001')"
echo "   testSocket.on('connect', () => console.log('Manual test: Connected!'))"
echo ""
echo "🛑 To stop servers:"
echo "   kill $SERVER_PID $CLIENT_PID"
echo ""

# Save PIDs
echo "$SERVER_PID" > .server_pid
echo "$CLIENT_PID" > .client_pid

echo "🎯 Expected Results:"
echo "   ✅ No WebSocket connection errors"
echo "   ✅ Chat discussions load without issues"
echo "   ✅ Messages can be sent and received"
echo "   ✅ Real-time features work properly"
