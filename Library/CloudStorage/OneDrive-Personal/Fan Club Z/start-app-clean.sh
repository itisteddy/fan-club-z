#!/bin/bash

# Fan Club Z - Clean Startup Script
# This script ensures a clean restart of the application

echo "🚀 Fan Club Z - Clean Startup"
echo "=============================="

# Function to check if port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo "⚠️  Port $port is in use. Attempting to free it..."
        kill -9 $(lsof -t -i:$port) 2>/dev/null || true
        sleep 2
    fi
}

# Function to start servers with proper error handling
start_server() {
    local name=$1
    local directory=$2
    local command=$3
    local port=$4
    
    echo "🔧 Starting $name..."
    
    cd "$directory" || {
        echo "❌ Failed to enter $directory"
        exit 1
    }
    
    # Check if node_modules exists
    if [ ! -d "node_modules" ]; then
        echo "📦 Installing dependencies for $name..."
        npm install
    fi
    
    # Free up the port
    check_port "$port"
    
    # Start the server
    echo "▶️  Running: $command"
    $command &
    local pid=$!
    
    echo "✅ $name started (PID: $pid)"
    return 0
}

# Clean up any existing processes
echo "🧹 Cleaning up existing processes..."
pkill -f "tsx watch" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true
pkill -f "node.*server" 2>/dev/null || true
sleep 3

# Clear any port conflicts
check_port 3000
check_port 3001

# Get the script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "📂 Working directory: $SCRIPT_DIR"

# Check if both client and server directories exist
if [ ! -d "$SCRIPT_DIR/server" ]; then
    echo "❌ Server directory not found!"
    exit 1
fi

if [ ! -d "$SCRIPT_DIR/client" ]; then
    echo "❌ Client directory not found!"
    exit 1
fi

# Start backend server
echo ""
echo "🔧 Starting Backend Server (Port 3001)..."
start_server "Backend" "$SCRIPT_DIR/server" "npm run dev" 3001

# Wait for backend to start
echo "⏳ Waiting for backend to initialize..."
sleep 5

# Check if backend is responding
backend_health() {
    curl -s http://localhost:3001/health >/dev/null 2>&1
}

# Wait up to 30 seconds for backend to be ready
echo "🔍 Checking backend health..."
for i in {1..6}; do
    if backend_health; then
        echo "✅ Backend is healthy!"
        break
    else
        echo "⏳ Backend not ready yet... ($i/6)"
        sleep 5
    fi
done

# Start frontend server
echo ""
echo "🔧 Starting Frontend Server (Port 3000)..."
start_server "Frontend" "$SCRIPT_DIR/client" "npm run dev" 3000

# Wait for frontend to start
echo "⏳ Waiting for frontend to initialize..."
sleep 5

# Check if both servers are running
echo ""
echo "🔍 Final health check..."

# Check backend
if curl -s http://localhost:3001/health >/dev/null 2>&1; then
    echo "✅ Backend: Running on http://localhost:3001"
else
    echo "❌ Backend: Not responding"
fi

# Check frontend
if curl -s http://localhost:3000 >/dev/null 2>&1; then
    echo "✅ Frontend: Running on http://localhost:3000"
else
    echo "❌ Frontend: Not responding"
fi

echo ""
echo "🎉 STARTUP COMPLETE!"
echo "==================="
echo "🌐 Frontend: http://localhost:3000"
echo "🔧 Backend:  http://localhost:3001"
echo ""
echo "📱 Mobile Access (same network):"
echo "🌐 Frontend: http://$(ipconfig getifaddr en0 2>/dev/null || hostname -I | awk '{print $1}'):3000"
echo ""
echo "🛠️  Logs:"
echo "   - Backend logs will appear above"
echo "   - Frontend logs will appear in browser console"
echo ""
echo "⏹️  To stop servers:"
echo "   - Press Ctrl+C or run: pkill -f 'tsx watch|vite'"
echo ""
echo "🧪 To test app stability:"
echo "   - Run: node test-app-stability.mjs"
echo ""

# Keep script running and show basic monitoring
echo "📊 Monitoring servers (Ctrl+C to stop)..."
while true; do
    sleep 30
    
    # Quick health check every 30 seconds
    if ! pgrep -f "tsx watch" >/dev/null; then
        echo "⚠️  Backend server stopped!"
        break
    fi
    
    if ! pgrep -f "vite" >/dev/null; then
        echo "⚠️  Frontend server stopped!"
        break
    fi
    
    echo "💚 $(date '+%H:%M:%S') - Servers running normally"
done

echo "🛑 Server monitoring stopped"
