#!/bin/bash

# Make script executable
chmod +x "$0"

echo "🔄 Restarting Fan Club Z services with updated configuration..."

# Kill any existing processes
echo "🛑 Stopping existing processes..."
pkill -f "tsx watch"
pkill -f "vite"
pkill -f "node"
sleep 2

# Navigate to project directory
cd "$(dirname "$0")"

echo "🧹 Cleaning up build artifacts..."
rm -rf client/dist
rm -rf server/dist
rm -rf node_modules/.cache

echo "📦 Installing dependencies..."
npm run install:all

echo "🏗️ Building server..."
cd server && npm run build
cd ..

echo "🚀 Starting backend server..."
cd server && npm run dev &
SERVER_PID=$!
cd ..

echo "⏳ Waiting for backend to start..."
sleep 5

echo "🚀 Starting frontend client..."
cd client && npm run dev &
CLIENT_PID=$!
cd ..

echo "✅ Services started successfully!"
echo "📍 Backend: http://localhost:3001"
echo "📍 Frontend: http://localhost:3000"
echo "📍 Health check: http://localhost:3001/health"
echo "📍 API via proxy: http://localhost:3000/api/health"
echo ""
echo "🔍 Testing API endpoints..."

# Wait a moment for services to fully start
sleep 3

# Test endpoints
echo "Testing backend health..."
curl -s http://localhost:3001/health | jq . || echo "Backend not responding"

echo "Testing frontend proxy..."
curl -s http://localhost:3000/api/health | jq . || echo "Frontend proxy not responding"

echo ""
echo "🎯 If you still see 500 errors, check the console output above for specific error messages."
echo "📝 Backend PID: $SERVER_PID"
echo "📝 Frontend PID: $CLIENT_PID"
echo ""
echo "To stop services: kill $SERVER_PID $CLIENT_PID"
