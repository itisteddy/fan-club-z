#!/bin/bash

echo "🔍 Fan Club Z - Supabase Quick Check"
echo "=================================="
echo

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Please run this from the Fan Club Z project root directory"
    exit 1
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "❌ .env file not found. Please create it from .env.example"
    exit 1
fi

echo "✅ Found .env file"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "⚠️  node_modules not found. Installing dependencies..."
    npm install
fi

echo "✅ Dependencies ready"

# Check Node.js version
NODE_VERSION=$(node --version)
echo "✅ Node.js version: $NODE_VERSION"

echo
echo "🧪 Testing Supabase connection..."
echo "Running verification script..."

# Run the verification
node verify-supabase.js

echo
echo "🚀 If the verification passed, you can now start the application:"
echo "   npm run dev"
echo
echo "🌐 Access points:"
echo "   - Client: http://localhost:5173"
echo "   - Server API: http://localhost:3001"
echo "   - Supabase Dashboard: https://supabase.com/dashboard/project/ihtnsyhknvltgrksffun"
