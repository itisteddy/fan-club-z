#!/bin/bash

# Quick Backend Server Startup
echo "🚀 Starting Fan Club Z Backend Server..."

# Navigate to server directory
cd "/Users/efe/Library/CloudStorage/OneDrive-Personal/Fan Club Z/server"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing server dependencies..."
    npm install
fi

# Start the development server
echo "🎯 Starting backend on http://localhost:3001"
npm run dev
