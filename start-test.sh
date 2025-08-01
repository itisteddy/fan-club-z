#!/bin/bash

echo "🚀 Fan Club Z - Modern Testing Script"
echo "======================================"

# Change to project directory
cd "/Users/efe/Library/CloudStorage/OneDrive-Personal/Fan Club Z v2.0/FanClubZ-version2.0"

echo "📍 Current directory: $(pwd)"
echo ""

# Check Node version
echo "🔍 Checking Node.js version..."
NODE_VERSION=$(node --version 2>/dev/null)
if [ $? -eq 0 ]; then
    echo "✅ Node.js version: $NODE_VERSION"
else
    echo "❌ Node.js not found. Please install Node.js 18+ first."
    exit 1
fi

# Check npm version
echo "🔍 Checking npm version..."
NPM_VERSION=$(npm --version 2>/dev/null)
if [ $? -eq 0 ]; then
    echo "✅ npm version: $NPM_VERSION"
else
    echo "❌ npm not found. Please install npm first."
    exit 1
fi

echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm run install:all
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install dependencies."
        exit 1
    fi
    echo "✅ Dependencies installed successfully!"
else
    echo "✅ Dependencies already installed."
fi

echo ""
echo "🎯 Ready to test the modernized Fan Club Z!"
echo ""
echo "📱 What you'll see:"
echo "   • Modern emerald green design (#22c55e)"
echo "   • Premium card layouts with shadows"
echo "   • Smooth animations and transitions"
echo "   • Mobile-first responsive design"
echo "   • Touch-friendly interface elements"
echo ""
echo "🌐 Starting development servers..."
echo "   • Client: http://localhost:5173"
echo "   • Server: http://localhost:3001"
echo ""
echo "💡 Tip: Open http://localhost:5173 in your browser to see the modernized app!"
echo ""

# Start the development server
npm run dev