#!/bin/bash

# WebSocket Connection Test Script

echo "🔧 Testing Fan Club Z WebSocket Connection"
echo "=========================================="

# Check if server is running
echo "📡 Checking server status..."
if curl -s http://localhost:3001/health > /dev/null; then
    echo "✅ Server is running on port 3001"
else
    echo "❌ Server is not running on port 3001"
    echo "💡 Start the server with: cd server && npm run dev"
    exit 1
fi

# Check server response
echo ""
echo "🏥 Server health check:"
curl -s http://localhost:3001/health | python3 -m json.tool 2>/dev/null || echo "Server health endpoint not responding properly"

echo ""
echo "🔍 Checking environment variables..."

# Check client env file
if [ -f "client/.env.local" ]; then
    echo "📄 Client environment variables:"
    grep "VITE_API_URL\|VITE_WS_URL" client/.env.local
else
    echo "❌ Client .env.local file not found"
fi

echo ""
echo "🧪 Testing WebSocket connection..."

# Create a simple Node.js test script
cat > test-websocket.js << 'EOF'
const io = require('socket.io-client');

console.log('🔗 Attempting WebSocket connection to http://localhost:3001');

const socket = io('http://localhost:3001', {
    transports: ['websocket', 'polling'],
    timeout: 5000
});

socket.on('connect', () => {
    console.log('✅ WebSocket connected successfully!');
    console.log('📍 Socket ID:', socket.id);
    
    // Test authentication
    socket.emit('authenticate', {
        userId: 'test-user-id',
        username: 'TestUser',
        avatar: 'TU'
    });
    
    setTimeout(() => {
        socket.disconnect();
        process.exit(0);
    }, 2000);
});

socket.on('disconnect', (reason) => {
    console.log('🔌 Disconnected:', reason);
});

socket.on('connect_error', (error) => {
    console.error('❌ Connection error:', error.message);
    process.exit(1);
});

socket.on('authenticated', (data) => {
    console.log('🔐 Authentication successful:', data);
});

// Timeout after 10 seconds
setTimeout(() => {
    console.error('⏰ Connection timeout');
    process.exit(1);
}, 10000);
EOF

# Run the test if Node.js is available
if command -v node > /dev/null; then
    if [ -f "server/node_modules/socket.io-client/package.json" ]; then
        cd server && node ../test-websocket.js
    else
        echo "❌ socket.io-client not installed in server directory"
        echo "💡 Run: cd server && npm install socket.io-client"
    fi
else
    echo "❌ Node.js not found"
fi

# Cleanup
rm -f test-websocket.js

echo ""
echo "🎯 Next steps:"
echo "1. Make sure server is running: cd server && npm run dev"
echo "2. Make sure client is running: cd client && npm run dev"
echo "3. Open http://localhost:5173 and test chat"
echo "4. Check browser console for WebSocket connection logs"
