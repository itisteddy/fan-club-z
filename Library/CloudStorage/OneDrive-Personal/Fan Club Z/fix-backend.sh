#!/bin/bash

# Fix Login Issues - Backend Configuration Script
# This script fixes the backend server configuration and restarts it

echo "🔧 Fixing Fan Club Z Backend Configuration..."

# Navigate to server directory
cd "$(dirname "$0")/server" || exit 1

echo "📁 Current directory: $(pwd)"

# Kill any existing server processes
echo "🛑 Stopping existing server processes..."
pkill -f "tsx watch src/index.ts" || echo "No tsx processes found"
pkill -f "node.*index" || echo "No node processes found"

# Wait a moment for processes to stop
sleep 2

# Verify environment configuration
echo "🔍 Checking environment configuration..."
if [ -f .env ]; then
    echo "✅ .env file found"
    echo "📋 Current PORT setting:"
    grep "^PORT=" .env || echo "❌ PORT not set in .env"
else
    echo "❌ .env file not found!"
    exit 1
fi

if [ -f .env.local ]; then
    echo "✅ .env.local file found"
else
    echo "⚠️ .env.local file not found"
fi

# Check if node_modules exists
if [ ! -d node_modules ]; then
    echo "📦 Installing server dependencies..."
    npm install
fi

# Start the server
echo "🚀 Starting backend server on port 5001..."
echo "📱 Server will be available at:"
echo "   - http://localhost:5001"
echo "   - http://172.20.2.210:5001"
echo ""
echo "🌐 CORS configured for:"
echo "   - http://172.20.2.210:3000 (frontend)"
echo "   - http://localhost:3000 (local frontend)"
echo ""
echo "💡 To stop the server, press Ctrl+C"
echo ""

# Start with npm dev script
npm run dev
