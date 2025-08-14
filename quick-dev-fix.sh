#!/bin/bash

# Quick fix script for WebSocket connection issues

echo "🔧 Quick Fix for WebSocket Connection"
echo "===================================="

# 1. Check current directory
if [ ! -f "package.json" ]; then
    echo "❌ Please run this script from the project root directory"
    exit 1
fi

# 2. Check server environment
echo "📋 Checking server environment..."
if [ -f "server/.env" ]; then
    echo "✅ Server .env found"
else
    echo "⚠️  Server .env not found, copying from .env.local"
    cp .env.local server/.env 2>/dev/null || echo "❌ Could not copy .env.local to server/.env"
fi

# 3. Check client environment
echo "📋 Checking client environment..."
if [ -f "client/.env.local" ]; then
    echo "✅ Client .env.local found"
    # Check if it has the correct API URL
    if grep -q "VITE_API_URL=http://localhost:3001" client/.env.local; then
        echo "✅ Correct API URL configured"
    else
        echo "⚠️  Fixing API URL in client/.env.local"
        sed -i.bak 's|VITE_API_URL=.*|VITE_API_URL=http://localhost:3001|' client/.env.local
    fi
else
    echo "⚠️  Creating client/.env.local"
    cat > client/.env.local << 'EOF'
# Fan Club Z Client Environment Variables

# API Configuration
VITE_API_URL=http://localhost:3001
VITE_WS_URL=ws://localhost:3001

# Supabase Configuration (Real credentials)
VITE_SUPABASE_URL=https://ihtnsyhknvltgrksffun.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlodG5zeWhrbnZsdGdya3NmZnVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2NzA2MzYsImV4cCI6MjA2OTI0NjYzNn0.ZmoZ5cGVHfhDwTvkmaw9LSVHm_awoyMOTyQKewr7rYo

# Development Settings
VITE_ENVIRONMENT=development
VITE_DEBUG=true
EOF
fi

# 4. Start development servers
echo ""
echo "🚀 Starting development servers..."

# Kill existing processes on ports 3001 and 5173
echo "🔄 Killing existing processes..."
lsof -ti:3001 | xargs kill -9 2>/dev/null || true
lsof -ti:5173 | xargs kill -9 2>/dev/null || true

# Wait a moment
sleep 2

# Start server in background
echo "🖥️  Starting server..."
cd server
npm run dev > ../server.log 2>&1 &
SERVER_PID=$!
cd ..

# Wait for server to start
sleep 5

# Check if server started
if curl -s http://localhost:3001/health > /dev/null; then
    echo "✅ Server started successfully on port 3001"
else
    echo "❌ Server failed to start. Check server.log for details:"
    tail -n 10 server.log
    kill $SERVER_PID 2>/dev/null || true
    exit 1
fi

# Start client in background
echo "🌐 Starting client..."
cd client
npm run dev > ../client.log 2>&1 &
CLIENT_PID=$!
cd ..

# Wait for client to start
sleep 5

echo ""
echo "✅ Setup complete!"
echo ""
echo "📊 Status:"
echo "   Server: http://localhost:3001 (PID: $SERVER_PID)"
echo "   Client: http://localhost:5173 (PID: $CLIENT_PID)"
echo ""
echo "📋 To test chat:"
echo "   1. Open http://localhost:5173 in your browser"
echo "   2. Navigate to any prediction detail page"
echo "   3. Try opening a discussion or sending a message"
echo "   4. Check browser console for WebSocket connection logs"
echo ""
echo "📄 Logs:"
echo "   Server logs: tail -f server.log"
echo "   Client logs: tail -f client.log"
echo ""
echo "🛑 To stop servers:"
echo "   kill $SERVER_PID $CLIENT_PID"

# Store PIDs for easy cleanup
echo "SERVER_PID=$SERVER_PID" > .dev-pids
echo "CLIENT_PID=$CLIENT_PID" >> .dev-pids
