#!/bin/bash

# Fan Club Z - Port Management Script
# This script frees up the default ports used by the project

echo "🔧 Freeing up Fan Club Z default ports..."

# Function to kill process on a port
kill_port() {
    local port=$1
    local pids=$(lsof -ti:$port 2>/dev/null)
    
    if [ -n "$pids" ]; then
        echo "   🚫 Killing process on port $port (PID: $pids)"
        echo "$pids" | xargs kill -9 2>/dev/null
        echo "   ✅ Port $port is now free"
    else
        echo "   ✅ Port $port is already free"
    fi
}

# Free up default ports
echo "📱 Frontend port (3000):"
kill_port 3000

echo "🔌 Backend port (5001):"
kill_port 5001

echo ""
echo "🎯 Default ports are ready for Fan Club Z development!"
echo "   Frontend: http://localhost:3000"
echo "   Backend:  http://localhost:5001"
echo "" 