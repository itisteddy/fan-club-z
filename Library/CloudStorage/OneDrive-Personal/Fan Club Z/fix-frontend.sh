#!/bin/bash

# Fix Login Issues - Frontend Configuration Script
# This script fixes the frontend configuration and restarts it

echo "🔧 Fixing Fan Club Z Frontend Configuration..."

# Navigate to client directory
cd "$(dirname "$0")/client" || exit 1

echo "📁 Current directory: $(pwd)"

# Kill any existing frontend processes
echo "🛑 Stopping existing frontend processes..."
pkill -f "vite" || echo "No vite processes found"

# Wait a moment for processes to stop
sleep 2

# Verify environment configuration
echo "🔍 Checking environment configuration..."
if [ -f .env.local ]; then
    echo "✅ .env.local file found"
    echo "📋 Current API URL setting:"
    grep "^VITE_API_URL=" .env.local || echo "❌ VITE_API_URL not set in .env.local"
else
    echo "❌ .env.local file not found!"
    exit 1
fi

# Check if node_modules exists
if [ ! -d node_modules ]; then
    echo "📦 Installing frontend dependencies..."
    npm install
fi

# Start the frontend
echo "🚀 Starting frontend on port 3000..."
echo "📱 Frontend will be available at:"
echo "   - http://localhost:3000"
echo "   - http://172.20.2.210:3000"
echo ""
echo "🔌 Configured to connect to backend at:"
echo "   - http://172.20.2.210:5001/api"
echo ""
echo "💡 To stop the frontend, press Ctrl+C"
echo ""

# Start with npm dev script
npm run dev
