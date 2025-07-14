#!/bin/bash

echo "🔍 Quick React Test - Identifying Babel Parser Error"
echo "=================================================="

# Kill existing processes
echo "🔄 Stopping existing servers..."
pkill -f "vite" 2>/dev/null
pkill -f "tsx watch" 2>/dev/null
sleep 2

# Check if servers are running
echo "📊 Checking server status..."
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo "❌ Frontend server still running on port 3000"
    exit 1
fi

if curl -s http://localhost:3001 > /dev/null 2>&1; then
    echo "❌ Backend server still running on port 3001"
    exit 1
fi

echo "✅ Servers stopped successfully"

# Start backend server
echo "🚀 Starting backend server..."
cd server
npm run dev > ../backend-startup.log 2>&1 &
BACKEND_PID=$!
cd ..

# Wait for backend to start
echo "⏳ Waiting for backend to start..."
sleep 5

# Check backend health
echo "🏥 Checking backend health..."
if curl -s http://localhost:3001/health > /dev/null 2>&1; then
    echo "✅ Backend is healthy"
else
    echo "❌ Backend health check failed"
    echo "📄 Backend logs:"
    tail -20 backend-startup.log
    exit 1
fi

# Start frontend server
echo "🚀 Starting frontend server..."
cd client
npm run dev > ../frontend-startup.log 2>&1 &
FRONTEND_PID=$!
cd ..

# Wait for frontend to start
echo "⏳ Waiting for frontend to start..."
sleep 8

# Check for Babel parser errors in frontend logs
echo "🔍 Checking for Babel parser errors..."
if grep -q "Unexpected token" frontend-startup.log; then
    echo "❌ Babel parser error found!"
    echo "📄 Error details:"
    grep -A 5 -B 5 "Unexpected token" frontend-startup.log
    echo ""
    echo "🔧 This is likely a syntax error in a TypeScript/JavaScript file"
    echo "📁 Check the file mentioned in the error above"
    exit 1
fi

# Check if frontend is serving HTML
echo "🌐 Checking frontend HTML..."
if curl -s http://localhost:3000 | grep -q "main.tsx"; then
    echo "✅ Frontend is serving HTML with main.tsx reference"
else
    echo "❌ Frontend HTML check failed"
    echo "📄 Frontend logs:"
    tail -20 frontend-startup.log
    exit 1
fi

# Quick Playwright test to check React initialization
echo "🧪 Running quick React test..."
npx playwright test client/e2e-tests/debug-app-component.spec.ts --reporter=list 2>/dev/null

# Cleanup
echo "🧹 Cleaning up..."
kill $BACKEND_PID 2>/dev/null
kill $FRONTEND_PID 2>/dev/null

echo ""
echo "📊 Quick Test Summary:"
echo "====================="
echo "✅ Backend: Running and healthy"
echo "✅ Frontend: Serving HTML"
echo "✅ No Babel parser errors found"
echo ""
echo "🎯 If React still isn't initializing, run: ./diagnose-runtime-errors.sh"
