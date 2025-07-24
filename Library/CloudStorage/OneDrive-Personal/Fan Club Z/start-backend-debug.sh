#!/bin/bash

echo "🔧 Fan Club Z Server Diagnostic & Startup"
echo "========================================"

# Check if we're in the right directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
SERVER_DIR="$SCRIPT_DIR/server"

echo "📂 Script directory: $SCRIPT_DIR"
echo "📂 Server directory: $SERVER_DIR"

if [ ! -d "$SERVER_DIR" ]; then
    echo "❌ Server directory not found at: $SERVER_DIR"
    exit 1
fi

cd "$SERVER_DIR"

# Check prerequisites
echo ""
echo "🔍 Checking prerequisites..."

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed"
    exit 1
fi
echo "✅ Node.js version: $(node --version)"

# Check npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed"
    exit 1
fi
echo "✅ npm version: $(npm --version)"

# Check package.json
if [ ! -f "package.json" ]; then
    echo "❌ package.json not found"
    exit 1
fi
echo "✅ package.json found"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo ""
    echo "📦 Installing dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install dependencies"
        exit 1
    fi
else
    echo "✅ node_modules found"
fi

# Check .env file
if [ ! -f ".env" ]; then
    echo ""
    echo "⚠️  Creating .env file..."
    cp .env.local .env 2>/dev/null || echo "DATABASE_URL=postgresql://postgres.rancdgutigsuapxzwolr:ZXCVbnm,@13579@aws-0-us-east-2.pooler.supabase.com:6543/postgres
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_REFRESH_SECRET=your-super-secret-jwt-refresh-key-change-this-in-production
NODE_ENV=development
PORT=3001" > .env
fi
echo "✅ .env file exists"

# Check source files
if [ ! -d "src" ] || [ ! -f "src/index.ts" ]; then
    echo "❌ Source files not found"
    exit 1
fi
echo "✅ Source files found"

echo ""
echo "🚀 Starting server..."
echo "📍 API URL: http://localhost:3001/api"
echo "📊 Health: http://localhost:3001/health"
echo ""
echo "Press Ctrl+C to stop"
echo ""

# Start the server with verbose output
npm run dev

