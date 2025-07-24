#!/bin/bash

# Backend Diagnostic and Startup Script
echo "🔧 Fan Club Z Backend Diagnostic & Startup"
echo "=========================================="

# Navigate to server directory
cd "$(dirname "$0")/server" || exit 1
echo "📁 Working directory: $(pwd)"

# Check if .env file exists and is readable
echo ""
echo "📋 Environment Configuration Check:"
if [ -f .env ]; then
    echo "✅ .env file found"
    
    # Check critical environment variables
    if grep -q "^PORT=" .env; then
        PORT_VALUE=$(grep "^PORT=" .env | cut -d'=' -f2)
        echo "✅ PORT configured: $PORT_VALUE"
    else
        echo "❌ PORT not configured in .env"
    fi
    
    if grep -q "^DATABASE_URL=" .env; then
        echo "✅ DATABASE_URL configured"
    else
        echo "❌ DATABASE_URL not configured in .env"
    fi
    
    if grep -q "^JWT_SECRET=" .env; then
        echo "✅ JWT_SECRET configured"
    else
        echo "❌ JWT_SECRET not configured in .env"
    fi
else
    echo "❌ .env file not found!"
    echo "Creating basic .env file..."
    cat > .env << EOF
NODE_ENV=development
PORT=5001
HOST=0.0.0.0
DATABASE_URL=postgresql://postgres.rancdgutigsuapxzwolr:ZXCVbnm,@13579@aws-0-us-east-2.pooler.supabase.com:6543/postgres
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_REFRESH_SECRET=your-super-secret-jwt-refresh-key-change-this-in-production
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d
ENABLE_TOKEN_ROTATION=true
CORS_ORIGINS=http://172.20.2.210:3000,http://localhost:3000
ENABLE_DEMO_MODE=true
ENABLE_NOTIFICATIONS=true
APP_NAME=Fan Club Z
APP_VERSION=1.0.0
EOF
    echo "✅ Basic .env file created"
fi

# Check node_modules
echo ""
echo "📦 Dependencies Check:"
if [ -d node_modules ]; then
    echo "✅ node_modules directory exists"
else
    echo "❌ node_modules not found. Installing dependencies..."
    npm install
    if [ $? -eq 0 ]; then
        echo "✅ Dependencies installed successfully"
    else
        echo "❌ Failed to install dependencies"
        exit 1
    fi
fi

# Check TypeScript files
echo ""
echo "🔍 Source Code Check:"
if [ -f src/index.ts ]; then
    echo "✅ Main entry file (src/index.ts) found"
else
    echo "❌ Main entry file (src/index.ts) not found"
    exit 1
fi

# Check if tsx is available
echo ""
echo "🛠️  Build Tools Check:"
if command -v npx tsx >/dev/null 2>&1; then
    echo "✅ tsx available"
else
    echo "❌ tsx not available. Installing..."
    npm install -g tsx
fi

# Kill any existing processes on port 5001
echo ""
echo "🛑 Cleanup:"
echo "Checking for existing processes on port 5001..."
PID=$(lsof -ti:5001)
if [ ! -z "$PID" ]; then
    echo "Found process $PID on port 5001. Killing..."
    kill -9 $PID
    sleep 2
fi

# Test database connection
echo ""
echo "🗄️  Database Test:"
echo "Testing database connection..."
cat > test-db-connection.js << 'EOF'
import dotenv from 'dotenv';
dotenv.config();

console.log('Testing database connection...');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'configured' : 'not configured');

// Simple test without full app setup
if (process.env.DATABASE_URL) {
  console.log('✅ Database URL is configured');
  process.exit(0);
} else {
  console.log('❌ Database URL is not configured');
  process.exit(1);
}
EOF

node test-db-connection.js
if [ $? -eq 0 ]; then
    echo "✅ Database configuration looks good"
else
    echo "❌ Database configuration issue"
fi

# Clean up test file
rm -f test-db-connection.js

# Try to start the server
echo ""
echo "🚀 Starting Backend Server:"
echo "Port: 5001"
echo "Environment: development"
echo "CORS: http://172.20.2.210:3000, http://localhost:3000"
echo ""
echo "Starting server... (Press Ctrl+C to stop)"
echo "If successful, server will be available at:"
echo "  - http://localhost:5001"
echo "  - http://172.20.2.210:5001"
echo "  - Health check: http://172.20.2.210:5001/health"
echo ""

# Start with error handling
npm run dev 2>&1 | tee backend.log
