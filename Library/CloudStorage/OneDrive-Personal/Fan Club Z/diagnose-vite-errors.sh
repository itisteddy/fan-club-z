#!/bin/bash

echo "🔍 === DIAGNOSING VITE RUNTIME ERRORS ==="

# Function to check if port is in use
check_port() {
    local port=$1
    if lsof -i :$port > /dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Kill any existing Vite processes to start fresh
echo "🧹 Cleaning up existing processes..."
pkill -f "vite" || true
sleep 2

# Navigate to client directory
cd "$(dirname "$0")/client" || exit 1

echo "📁 Current directory: $(pwd)"
echo "🔍 Checking package.json and dependencies..."

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "❌ node_modules not found, installing dependencies..."
    npm install
fi

# Check for common dependency issues
echo "🔍 Checking for potential dependency conflicts..."
npm ls react react-dom 2>&1 | head -20

echo "🚀 Starting Vite dev server with verbose logging..."

# Start Vite with maximum logging and error detail
NODE_ENV=development DEBUG=vite:* npm run dev -- --host --port 3000 --force 2>&1 | tee vite-debug.log &

VITE_PID=$!
echo "🔄 Vite PID: $VITE_PID"

# Wait for server to start or fail
echo "⏳ Waiting for Vite to start (or fail)..."
sleep 10

# Check if server is running
if check_port 3000; then
    echo "✅ Vite server is running on port 3000"
    
    echo "🌐 Testing server response..."
    curl -v http://localhost:3000 > curl-response.log 2>&1
    
    echo "🔍 Testing main.tsx directly..."
    curl -v http://localhost:3000/src/main.tsx > main-tsx-response.log 2>&1
    
    echo "📋 Last 50 lines of Vite logs:"
    tail -50 vite-debug.log
    
    echo "📋 Curl response summary:"
    grep -E "(HTTP|Error|error)" curl-response.log || echo "No HTTP errors in curl response"
    
else
    echo "❌ Vite server failed to start"
    echo "📋 Full Vite error log:"
    cat vite-debug.log
fi

# Keep the process running for a bit to capture any additional errors
echo "⏳ Monitoring for additional errors (30 seconds)..."
sleep 30

echo "📋 Final Vite log (last 100 lines):"
tail -100 vite-debug.log

# Clean up
kill $VITE_PID 2>/dev/null || true

echo "✅ Diagnosis complete. Check vite-debug.log for full details."
