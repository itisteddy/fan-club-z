#!/bin/bash

echo "🔄 Restarting Fan Club Z development server..."
echo "📍 Current directory: $(pwd)"

# Kill any existing processes on the ports
echo "🛑 Stopping existing processes..."
pkill -f "vite" 2>/dev/null || true
pkill -f "node.*server" 2>/dev/null || true

# Wait a moment
sleep 2

# Clear any cached data
echo "🧹 Clearing caches..."
cd client && rm -rf dist node_modules/.vite 2>/dev/null || true
cd ..

# Start the development server
echo "🚀 Starting development server..."
npm run dev

echo "✅ Development server should be running!"
echo "🌐 Open http://localhost:5173 in your browser"
echo "🐛 If changes still don't show, try:"
echo "   - Hard refresh (Ctrl+Shift+R)"
echo "   - Clear browser cache"
echo "   - Check browser console for errors"
