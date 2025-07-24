#!/bin/bash

echo "🔄 Fan Club Z - Server Restart Script"
echo "=====================================\n"

# Kill any existing processes on ports 3000 and 3001
echo "🛑 Stopping any existing servers..."
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
lsof -ti:3001 | xargs kill -9 2>/dev/null || true

# Wait a moment for processes to fully terminate
sleep 2

echo "✅ Ports cleared\n"

# Start backend server first
echo "🚀 Starting backend server on port 3001..."
cd server
npm run dev &
BACKEND_PID=$!

# Wait for backend to start
echo "⏳ Waiting for backend to initialize..."
sleep 5

# Start frontend server
echo "🚀 Starting frontend server on port 3000..."
cd ../client
npm run dev &
FRONTEND_PID=$!

echo "\n✅ Both servers starting..."
echo "📱 Frontend: http://localhost:3000"
echo "🔗 Backend API: http://localhost:3001/api"
echo "🏥 Backend Health: http://localhost:3001/health"
echo "\n🛑 Press Ctrl+C to stop both servers"

# Function to handle cleanup on script exit
cleanup() {
    echo "\n🛑 Shutting down servers..."
    kill $BACKEND_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Wait for both processes
wait
