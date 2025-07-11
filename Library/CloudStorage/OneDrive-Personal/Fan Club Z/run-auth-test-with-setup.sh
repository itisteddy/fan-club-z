#!/bin/bash

echo "🔧 Setting up environment for test..."

# Make sure we're in the right directory
cd "/Users/efe/Library/CloudStorage/OneDrive-Personal/Fan Club Z"

# Check if both client and server are ready
echo "📦 Checking client dependencies..."
cd client
if [ ! -d "node_modules" ]; then
  echo "Installing client dependencies..."
  npm install
fi

echo "📦 Checking server dependencies..."
cd ../server
if [ ! -d "node_modules" ]; then
  echo "Installing server dependencies..."
  npm install
fi

echo "🚀 Starting development servers..."
cd ..

# Start both client and server
npm run dev &
DEV_PID=$!

echo "⏳ Waiting for servers to start..."
sleep 10

# Check if servers are running
echo "🔍 Checking if client is accessible..."
curl -s http://localhost:3000 > /dev/null
if [ $? -eq 0 ]; then
  echo "✅ Client server is running on port 3000"
else
  echo "❌ Client server is not accessible"
fi

echo "🔍 Checking if API is accessible..."
curl -s http://localhost:5001/health > /dev/null
if [ $? -eq 0 ]; then
  echo "✅ API server is running on port 5001"
else
  echo "❌ API server is not accessible"
fi

echo "🧪 Running authentication test..."
cd client
npx playwright test --grep "should display login page for unauthenticated users" --reporter=list

# Clean up
echo "🛑 Stopping servers..."
kill $DEV_PID 2>/dev/null || true
