#!/bin/bash

echo "🔧 Quick Server Troubleshooting"
echo "==============================="

cd "/Users/efe/Library/CloudStorage/OneDrive-Personal/Fan Club Z"

# Check what's running on the ports
echo "🔍 Checking what's using ports 3000 and 3001..."
echo ""

echo "Port 3000 (Frontend):"
lsof -i :3000 2>/dev/null || echo "Nothing running on port 3000"

echo ""
echo "Port 3001 (Backend):"
lsof -i :3001 2>/dev/null || echo "Nothing running on port 3001"

echo ""
echo "🚀 Quick Start Commands:"
echo ""

# Frontend start command
echo "1️⃣  Start Frontend:"
echo "   cd client"
echo "   npm run dev"
echo ""

# Backend start command  
echo "2️⃣  Start Backend:"
echo "   cd server"
echo "   npm start"
echo ""

# Manual verification
echo "3️⃣  Verify servers are running:"
echo "   Frontend: curl http://localhost:3000"
echo "   Backend:  curl http://localhost:3001/api/health"
echo ""

# Kill any existing processes
echo "🧹 To kill existing processes:"
pkill -f "vite" 2>/dev/null && echo "Killed Vite processes" || echo "No Vite processes running"
pkill -f "node.*server" 2>/dev/null && echo "Killed Node server processes" || echo "No Node server processes"

echo ""
echo "💡 If servers won't start:"
echo "1. Check if ports are blocked by firewall"
echo "2. Try different ports (PORT=3002 npm run dev)"
echo "3. Restart your terminal/computer"
echo "4. Check for node_modules issues (rm -rf node_modules && npm install)"
