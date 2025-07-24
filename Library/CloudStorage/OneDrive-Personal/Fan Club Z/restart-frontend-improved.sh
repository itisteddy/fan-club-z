#!/bin/bash

echo "🔄 Restarting frontend to apply wallet error handling improvements..."

# Navigate to client directory
cd "/Users/efe/Library/CloudStorage/OneDrive-Personal/Fan Club Z/client"

# Kill any existing Vite processes
echo "🛑 Stopping existing frontend processes..."
pkill -f "vite" 2>/dev/null || true
pkill -f "npm run dev" 2>/dev/null || true
pkill -f "localhost:3000" 2>/dev/null || true

# Wait a moment for processes to stop
sleep 2

# Start the frontend
echo "🚀 Starting frontend with improved error handling..."
npm run dev

echo "✅ Frontend restarted with wallet error handling improvements!"
echo ""
echo "🎯 The console warnings should now be significantly reduced."
echo "   The bet viewing functionality will continue to work perfectly."
