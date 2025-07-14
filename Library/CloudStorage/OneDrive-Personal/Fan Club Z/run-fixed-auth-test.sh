#!/bin/bash

echo "🚀 Starting Fan Club Z Authentication Flow Test"

# Function to check if port is in use
check_port() {
    local port=$1
    if lsof -i :$port > /dev/null 2>&1; then
        echo "✅ Port $port is in use"
        return 0
    else
        echo "❌ Port $port is not in use"
        return 1
    fi
}

# Function to start server if not running
start_server() {
    local name=$1
    local port=$2
    local directory=$3
    local command=$4
    
    if check_port $port; then
        echo "✅ $name server already running on port $port"
    else
        echo "🚀 Starting $name server..."
        cd "$directory"
        $command &
        
        # Wait for server to start
        echo "⏳ Waiting for $name server to start..."
        for i in {1..30}; do
            if check_port $port; then
                echo "✅ $name server started successfully"
                break
            fi
            sleep 1
        done
        
        if ! check_port $port; then
            echo "❌ Failed to start $name server on port $port"
            exit 1
        fi
    fi
}

echo "🔍 Checking current directory..."
pwd

# Start backend server
echo "🔍 Starting backend server..."
start_server "Backend" 8000 "server" "npm run dev"

# Start frontend server
echo "🔍 Starting frontend server..."
start_server "Frontend" 3000 "client" "npm run dev"

# Wait a moment for both servers to fully initialize
echo "⏳ Waiting for servers to fully initialize..."
sleep 5

# Verify both servers are responding
echo "🔍 Verifying server health..."

# Check backend health
if curl -s http://localhost:8000/api/health > /dev/null; then
    echo "✅ Backend server is responding"
else
    echo "❌ Backend server is not responding"
fi

# Check frontend
if curl -s http://localhost:3000 > /dev/null; then
    echo "✅ Frontend server is responding"
else
    echo "❌ Frontend server is not responding"
fi

echo "🧪 Running authentication flow tests..."

# Navigate to client directory for playwright
cd client

# Run the fixed auth test
echo "🔍 Running fixed authentication test..."
npx playwright test ../test-auth-flow-fixed.mjs --headed

echo "✅ Test execution completed!"
echo "📸 Check the following screenshots for results:"
echo "   - test-auth-flow-step1.png"
echo "   - test-auth-flow-step2.png" 
echo "   - test-demo-login-before.png"
echo "   - test-demo-login-after.png"
echo "   - test-navigation-complete.png"
