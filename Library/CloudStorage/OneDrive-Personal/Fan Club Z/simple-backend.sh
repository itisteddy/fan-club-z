#!/bin/bash

# Simple Backend Startup with Error Handling
echo "🚀 Starting Fan Club Z Backend Server"
echo "====================================="

cd "$(dirname "$0")/server" || {
    echo "❌ Could not navigate to server directory"
    exit 1
}

echo "📁 Working in: $(pwd)"

# Check if package.json exists
if [ ! -f package.json ]; then
    echo "❌ package.json not found in server directory"
    exit 1
fi

# Check if node_modules exists
if [ ! -d node_modules ]; then
    echo "📦 Installing dependencies..."
    npm install || {
        echo "❌ Failed to install dependencies"
        exit 1
    }
fi

# Set environment variables explicitly
export NODE_ENV=development
export PORT=5001
export HOST=0.0.0.0

echo "🔧 Configuration:"
echo "   NODE_ENV: $NODE_ENV"
echo "   PORT: $PORT"
echo "   HOST: $HOST"

# Kill any existing process on port 5001
echo "🛑 Stopping any existing servers on port 5001..."
pkill -f "tsx.*index.ts" 2>/dev/null || true
pkill -f "node.*5001" 2>/dev/null || true
lsof -ti:5001 | xargs kill -9 2>/dev/null || true
sleep 2

echo ""
echo "🚀 Starting server..."
echo "   Local: http://localhost:5001"
echo "   Network: http://172.20.2.210:5001" 
echo "   Health: http://172.20.2.210:5001/health"
echo ""
echo "💡 Press Ctrl+C to stop the server"
echo "📝 Logs will appear below:"
echo ""

# Start the server with detailed error output
npm run dev 2>&1 || {
    echo ""
    echo "❌ Server failed to start. Common issues:"
    echo "   1. Port 5001 might be in use"
    echo "   2. Missing environment variables"
    echo "   3. Database connection issues"
    echo "   4. Missing dependencies"
    echo ""
    echo "🔍 Try running: ./diagnose-backend.sh for detailed diagnostics"
    exit 1
}
