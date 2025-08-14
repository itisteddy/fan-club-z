#!/bin/bash

echo "🔧 Restarting Fan Club Z with WebSocket Fix"
echo "==========================================="

# Kill any existing processes
echo "🛑 Stopping existing processes..."
pkill -f "vite.*5173" 2>/dev/null || true
pkill -f "tsx.*server" 2>/dev/null || true
pkill -f "node.*3001" 2>/dev/null || true

# Wait for processes to stop
sleep 3

# Start server
echo "🖥️  Starting server on port 3001..."
cd server
npm run dev &
SERVER_PID=$!
cd ..

# Wait for server to start
echo "⏳ Waiting for server to start..."
sleep 8

# Check if server is running
if curl -s http://localhost:3001/health > /dev/null; then
    echo "✅ Server is running on http://localhost:3001"
else
    echo "❌ Server failed to start"
    kill $SERVER_PID 2>/dev/null || true
    exit 1
fi

# Start client
echo "🌐 Starting client on port 5173..."
cd client  
npm run dev &
CLIENT_PID=$!
cd ..

# Wait for client to start
echo "⏳ Waiting for client to start..."
sleep 8

echo ""
echo "✅ Both services are starting!"
echo ""
echo "📊 Services:"
echo "   🖥️  Server: http://localhost:3001 (PID: $SERVER_PID)"
echo "   🌐 Client: http://localhost:5173 (PID: $CLIENT_PID)"
echo ""
echo "🧪 To test WebSocket connection:"
echo "   1. Open http://localhost:5173"
echo "   2. Navigate to any prediction"
echo "   3. Open browser console"
echo "   4. Look for: '🔗 Connected to chat server'"
echo ""
echo "🛑 To stop both services:"
echo "   kill $SERVER_PID $CLIENT_PID"

# Save PIDs for easy cleanup
echo "$SERVER_PID" > .server_pid
echo "$CLIENT_PID" > .client_pid
