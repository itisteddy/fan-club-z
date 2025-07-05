#!/bin/bash

echo "🚀 Setting up Fan Club Z Application..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v) detected"

# Install root dependencies
echo "📦 Installing root dependencies..."
npm install

# Install client dependencies
echo "📱 Installing client dependencies..."
cd client && npm install

# Install server dependencies  
echo "🖥️  Installing server dependencies..."
cd ../server && npm install

# Go back to root
cd ..

# Copy environment file
if [ ! -f .env ]; then
    echo "⚙️  Setting up environment file..."
    cp .env.local .env
    echo "✅ Created .env file (edit as needed)"
else
    echo "⚙️  .env file already exists"
fi

echo ""
echo "🎉 Setup complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🚀 To start the application:"
echo "   npm run dev"
echo ""
echo "🌍 URLs:"
echo "   Frontend: http://localhost:3000"
echo "   Backend:  http://localhost:5001"
echo ""
echo "🧪 Demo account:"
echo "   Email:    demo@fanclubz.app"
echo "   Password: demo123"
echo ""
echo "Happy betting! 🎯"
