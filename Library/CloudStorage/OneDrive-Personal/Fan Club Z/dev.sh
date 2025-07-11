#!/bin/bash

# Fan Club Z - Development Startup Script
# This script handles port management and starts both frontend and backend servers

set -e  # Exit on any error

echo "🚀 Fan Club Z Development Environment"
echo "======================================"

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "client" ] || [ ! -d "server" ]; then
    echo "❌ Error: Please run this script from the Fan Club Z root directory"
    exit 1
fi

# Free up ports first
echo ""
echo "🔧 Step 1: Freeing up default ports..."
./free-ports.sh

# Check if dependencies are installed
echo ""
echo "📦 Step 2: Checking dependencies..."

if [ ! -d "node_modules" ]; then
    echo "   Installing root dependencies..."
    npm install
fi

if [ ! -d "client/node_modules" ]; then
    echo "   Installing client dependencies..."
    cd client && npm install && cd ..
fi

if [ ! -d "server/node_modules" ]; then
    echo "   Installing server dependencies..."
    cd server && npm install && cd ..
fi

# Start the development servers
echo ""
echo "🎯 Step 3: Starting development servers..."
echo "   Frontend: http://localhost:3000"
echo "   Backend:  http://localhost:5001"
echo "   Mobile:   http://172.20.5.20:3000"
echo ""
echo "Press Ctrl+C to stop all servers"
echo ""

# Start both servers concurrently
npm run dev 