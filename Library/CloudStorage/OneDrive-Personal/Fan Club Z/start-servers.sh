#!/bin/bash

echo "🚀 Starting Fan Club Z Development Servers"
echo "=========================================="

cd "/Users/efe/Library/CloudStorage/OneDrive-Personal/Fan Club Z"

# Function to check if a port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo "✅ Port $port is in use"
        return 0
    else
        echo "❌ Port $port is not in use"
        return 1
    fi
}

# Check current server status
echo "🔍 Checking server status..."
echo ""

# Check frontend (port 3000)
if check_port 3000; then
    echo "📱 Frontend server: RUNNING"
else
    echo "📱 Frontend server: NOT RUNNING"
fi

# Check backend (port 3001)
if check_port 3001; then
    echo "⚙️  Backend server: RUNNING"
else
    echo "⚙️  Backend server: NOT RUNNING"
fi

echo ""
echo "🚀 Starting servers..."
echo ""

# Start backend server
echo "1️⃣  Starting backend server (port 3001)..."
cd server
if [ -f "package.json" ]; then
    # Check if node_modules exists
    if [ ! -d "node_modules" ]; then
        echo "📦 Installing backend dependencies..."
        npm install
    fi
    
    # Start backend in background
    echo "🎯 Starting backend server..."
    npm start > ../backend.log 2>&1 &
    BACKEND_PID=$!
    echo "Backend PID: $BACKEND_PID"
    
    # Wait a moment for backend to start
    sleep 3
    
    if check_port 3001; then
        echo "✅ Backend server started successfully"
    else
        echo "❌ Backend server failed to start"
        echo "📄 Check backend.log for errors"
    fi
else
    echo "❌ Backend package.json not found"
fi

echo ""

# Start frontend server
echo "2️⃣  Starting frontend server (port 3000)..."
cd ../client
if [ -f "package.json" ]; then
    # Check if node_modules exists
    if [ ! -d "node_modules" ]; then
        echo "📦 Installing frontend dependencies..."
        npm install
    fi
    
    # Start frontend in background
    echo "🎯 Starting frontend server..."
    npm run dev > ../frontend.log 2>&1 &
    FRONTEND_PID=$!
    echo "Frontend PID: $FRONTEND_PID"
    
    # Wait a moment for frontend to start
    sleep 5
    
    if check_port 3000; then
        echo "✅ Frontend server started successfully"
    else
        echo "❌ Frontend server failed to start"
        echo "📄 Check frontend.log for errors"
    fi
else
    echo "❌ Frontend package.json not found"
fi

echo ""
echo "📊 Final Status Check:"
echo "====================="

# Final status check
if check_port 3001 && check_port 3000; then
    echo "🎉 SUCCESS! Both servers are running"
    echo ""
    echo "🌐 Access your app at:"
    echo "   Frontend: http://localhost:3000"
    echo "   Backend:  http://localhost:3001"
    echo ""
    echo "📱 On mobile, use your computer's IP:"
    echo "   Frontend: http://$(hostname -I | awk '{print $1}'):3000"
    echo "   Backend:  http://$(hostname -I | awk '{print $1}'):3001"
    echo ""
    echo "🔧 To stop servers later:"
    echo "   kill $FRONTEND_PID $BACKEND_PID"
    
elif check_port 3000; then
    echo "⚠️  Frontend is running but backend is not"
    echo "❌ You may experience API errors"
    
elif check_port 3001; then
    echo "⚠️  Backend is running but frontend is not"
    echo "❌ App won't be accessible"
    
else
    echo "❌ Neither server is running"
    echo "📄 Check the log files:"
    echo "   - frontend.log"
    echo "   - backend.log"
fi

echo ""
echo "💡 Tips:"
echo "- Wait 10-30 seconds for servers to fully start"
echo "- Try refreshing your browser"
echo "- Check that no other apps are using ports 3000/3001"
