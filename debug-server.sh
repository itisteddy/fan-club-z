#!/bin/bash
chmod +x debug-server.sh

echo "🔧 Fan Club Z Server Debug & Fix Script"
echo "========================================"

# Check current directory
echo "📍 Current directory: $(pwd)"

# Check if .env file exists
if [ -f ".env" ]; then
    echo "✅ .env file found"
    echo "📝 Checking environment variables..."
    
    # Check for key environment variables
    if grep -q "SUPABASE_URL=" .env; then
        echo "✅ SUPABASE_URL found in .env"
    else
        echo "❌ SUPABASE_URL missing in .env"
    fi
    
    if grep -q "VITE_SUPABASE_URL=" .env; then
        echo "✅ VITE_SUPABASE_URL found in .env"
    else
        echo "❌ VITE_SUPABASE_URL missing in .env"
    fi
    
    if grep -q "SUPABASE_ANON_KEY=" .env; then
        echo "✅ SUPABASE_ANON_KEY found in .env"
    else
        echo "❌ SUPABASE_ANON_KEY missing in .env"
    fi
    
    if grep -q "VITE_SUPABASE_ANON_KEY=" .env; then
        echo "✅ VITE_SUPABASE_ANON_KEY found in .env"
    else
        echo "❌ VITE_SUPABASE_ANON_KEY missing in .env"
    fi
else
    echo "❌ .env file not found"
    echo "📄 Creating basic .env file..."
    
    cat > .env << 'EOF'
# Fan Club Z Environment Configuration
NODE_ENV=development
PORT=3001

# Supabase Configuration
SUPABASE_URL=https://ihtnsyhknvltgrksffun.supabase.co
VITE_SUPABASE_URL=https://ihtnsyhknvltgrksffun.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlodG5zeWhrbnZsdGdya3NmZnVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2NzA2MzYsImV4cCI6MjA2OTI0NjYzNn0.ZmoZ5cGVHfhDwTvkmaw9LSVHm_awoyMOTyQKewr7rYo
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlodG5zeWhrbnZsdGdya3NmZnVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2NzA2MzYsImV4cCI6MjA2OTI0NjYzNn0.ZmoZ5cGVHfhDwTvkmaw9LSVHm_awoyMOTyQKewr7rYo
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlodG5zeWhrbnZsdGdya3NmZnVuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzY3MDYzNiwiZXhwIjoyMDY5MjQ2NjM2fQ.w0Yr9MoA7Sj1c19lXD7te_Q6vmtY4dRAyxaS6yN8sTY

# Security
JWT_SECRET=your-jwt-secret-here
VALIDATE_ENV=false
EOF
    
    echo "✅ Basic .env file created"
fi

echo ""
echo "🧪 Testing server configurations..."

# Test 1: Check if Node.js can load the environment
echo "Test 1: Node.js environment loading..."
node -e "
require('dotenv').config();
console.log('✅ Node.js can load environment');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? 'Present' : 'Missing');
console.log('VITE_SUPABASE_URL:', process.env.VITE_SUPABASE_URL ? 'Present' : 'Missing');
console.log('SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? 'Present' : 'Missing');
console.log('VITE_SUPABASE_ANON_KEY:', process.env.VITE_SUPABASE_ANON_KEY ? 'Present' : 'Missing');
"

echo ""
echo "Test 2: Quick server test..."
if [ -f "quick-server-test.js" ]; then
    echo "🚀 Starting quick server test..."
    timeout 10s node quick-server-test.js &
    SERVER_PID=$!
    
    # Wait a moment for server to start
    sleep 3
    
    # Test the health endpoint
    echo "📊 Testing health endpoint..."
    curl -s http://localhost:3001/health || echo "❌ Health check failed"
    
    # Test Supabase configuration
    echo "🔍 Testing Supabase configuration..."
    curl -s http://localhost:3001/api/test-supabase || echo "❌ Supabase test failed"
    
    # Kill the test server
    kill $SERVER_PID 2>/dev/null
    
    echo "✅ Quick server test completed"
else
    echo "❌ quick-server-test.js not found"
fi

echo ""
echo "🛠️ Recommended fixes:"
echo "1. Run the server with: cd server && npm run dev"
echo "2. If that fails, try: node quick-server-test.js"
echo "3. Check the environment variables are correctly set"
echo "4. Make sure you're in the correct directory"
echo ""
echo "📝 Environment file status:"
ls -la .env* 2>/dev/null || echo "No .env files found"
