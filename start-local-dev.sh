#!/bin/bash

# FanClubZ Local Development Startup Script
# This script starts both the server and client for local development

set -e

echo "🚀 Starting FanClubZ Local Development Environment"
echo ""

# Get the project root directory
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js v20+ first."
    exit 1
fi

echo "✅ Node.js version: $(node --version)"
echo "✅ npm version: $(npm --version)"
echo ""

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing root dependencies..."
    npm install
fi

if [ ! -d "client/node_modules" ]; then
    echo "📦 Installing client dependencies..."
    cd client && npm install && cd ..
fi

if [ ! -d "server/node_modules" ]; then
    echo "📦 Installing server dependencies..."
    cd server && npm install && cd ..
fi

echo ""
echo "🔍 Checking environment files..."

# Check server .env
if [ ! -f "server/.env" ]; then
    echo "⚠️  Warning: server/.env not found"
    echo "   Please create server/.env with required variables (see LOCAL_TESTING_SETUP.md)"
else
    echo "✅ server/.env exists"
fi

# Check client .env.local
if [ ! -f "client/.env.local" ]; then
    echo "⚠️  Warning: client/.env.local not found"
    echo "   Please create client/.env.local with required variables (see LOCAL_TESTING_SETUP.md)"
else
    echo "✅ client/.env.local exists"
fi

echo ""
echo "🌐 Starting servers..."
echo ""
echo "📡 Backend Server: http://localhost:3001"
echo "💻 Frontend Client: http://localhost:5174"
echo ""
echo "Press Ctrl+C to stop both servers"
echo ""

# Start server in background
echo "Starting backend server..."
npm run dev > server.log 2>&1 &
SERVER_PID=$!

# Wait a moment for server to start
sleep 3

# Start client
echo "Starting frontend client..."
cd client
npm run dev &
CLIENT_PID=$!

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Stopping servers..."
    kill $SERVER_PID 2>/dev/null || true
    kill $CLIENT_PID 2>/dev/null || true
    cd ..
    echo "✅ Servers stopped"
    exit 0
}

# Trap Ctrl+C
trap cleanup INT TERM

# Wait for both processes
wait

