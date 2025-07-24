#!/bin/bash

echo "🚀 Starting Fan Club Z Backend Server..."

# Navigate to the correct directory
cd "/Users/efe/Library/CloudStorage/OneDrive-Personal/Fan Club Z/server"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Cannot find server package.json. Please check the path."
    exit 1
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing server dependencies..."
    npm install
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "⚠️  No .env file found. Creating one..."
    cat > .env << 'EOF'
# Fan Club Z Backend Environment Variables
NODE_ENV=development
PORT=3001
HOST=0.0.0.0

# Database Configuration
DATABASE_URL=postgresql://postgres.rancdgutigsuapxzwolr:ZXCVbnm,@13579@aws-0-us-east-2.pooler.supabase.com:6543/postgres

# Authentication
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=24h
JWT_REFRESH_SECRET=your-super-secret-jwt-refresh-key-change-this-in-production
JWT_REFRESH_EXPIRES_IN=7d
ENABLE_TOKEN_ROTATION=true

# CORS Configuration
CORS_ORIGINS=http://localhost:3000,http://localhost:3001

# Feature Flags
ENABLE_DEMO_MODE=true
ENABLE_NOTIFICATIONS=true

# App Settings
APP_NAME=Fan Club Z
APP_VERSION=1.0.0
EOF
    echo "✅ Created .env file with default configuration"
fi

echo "🎯 Starting development server on port 3001..."
echo "🌐 API will be available at: http://localhost:3001/api"
echo "📊 Health check: http://localhost:3001/health"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Start the server
npm run dev
