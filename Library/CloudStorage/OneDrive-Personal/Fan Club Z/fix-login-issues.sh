#!/bin/bash

echo "🔧 Fan Club Z - Login Issues Fix"
echo "================================"

# Kill any existing processes
echo "🛑 Stopping any existing servers..."
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
lsof -ti:5001 | xargs kill -9 2>/dev/null || true

echo "⏳ Waiting for ports to be free..."
sleep 3

echo ""
echo "🗄️ Testing database connection..."
cd server
if [ -f "dev.db" ]; then
    echo "✅ Database file exists"
    # Quick database test
    if command -v sqlite3 &> /dev/null; then
        TABLES=$(sqlite3 dev.db ".tables" 2>/dev/null || echo "")
        if [[ $TABLES == *"users"* ]]; then
            echo "✅ Database tables exist"
            # Check if demo user exists
            USER_COUNT=$(sqlite3 dev.db "SELECT COUNT(*) FROM users WHERE email='fausty@fcz.app';" 2>/dev/null || echo "0")
            echo "👥 Demo user exists: $USER_COUNT"
        else
            echo "⚠️ Database tables missing - may need migration"
        fi
    else
        echo "ℹ️ SQLite3 not available for testing"
    fi
else
    echo "❌ Database file missing"
fi

echo ""
echo "🚀 Starting backend server (port 5001)..."
npm run dev &
BACKEND_PID=$!

echo "⏳ Waiting for backend startup..."
sleep 8

# Test backend endpoints
echo ""
echo "🏥 Testing backend endpoints..."

# Health check
HEALTH=$(curl -s -w "%{http_code}" http://localhost:5001/api/health -o /tmp/health.json 2>/dev/null || echo "000")
if [ "$HEALTH" = "200" ]; then
    echo "✅ Health endpoint working"
    cat /tmp/health.json | head -c 100
    echo ""
else
    echo "❌ Health endpoint failed (HTTP $HEALTH)"
fi

# Test login endpoint with demo credentials
echo ""
echo "🔐 Testing login endpoint..."
LOGIN_RESPONSE=$(curl -s -w "%{http_code}" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"fausty@fcz.app","password":"demo123"}' \
  http://localhost:5001/api/users/login \
  -o /tmp/login.json 2>/dev/null || echo "000")

echo "Login response code: $LOGIN_RESPONSE"
if [ "$LOGIN_RESPONSE" = "200" ]; then
    echo "✅ Login endpoint working"
    echo "Response:"
    cat /tmp/login.json | jq . 2>/dev/null || cat /tmp/login.json
else
    echo "❌ Login endpoint failed"
    echo "Response:"
    cat /tmp/login.json 2>/dev/null || echo "No response"
fi

cd ..

echo ""
echo "🌐 Starting frontend server (port 3000)..."
cd client
npm run dev &
FRONTEND_PID=$!

echo "⏳ Waiting for frontend startup..."
sleep 8

# Test frontend proxy
echo ""
echo "🔄 Testing frontend proxy..."
PROXY_HEALTH=$(curl -s -w "%{http_code}" http://localhost:3000/api/health -o /tmp/proxy_health.json 2>/dev/null || echo "000")
if [ "$PROXY_HEALTH" = "200" ]; then
    echo "✅ Frontend proxy working"
else
    echo "❌ Frontend proxy failed (HTTP $PROXY_HEALTH)"
    echo "Response:"
    cat /tmp/proxy_health.json 2>/dev/null || echo "No response"
fi

# Test login through proxy
echo ""
echo "🔐 Testing login through frontend proxy..."
PROXY_LOGIN=$(curl -s -w "%{http_code}" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"fausty@fcz.app","password":"demo123"}' \
  http://localhost:3000/api/users/login \
  -o /tmp/proxy_login.json 2>/dev/null || echo "000")

echo "Proxy login response code: $PROXY_LOGIN"
if [ "$PROXY_LOGIN" = "200" ]; then
    echo "✅ Login through proxy working"
else
    echo "❌ Login through proxy failed"
    echo "Response:"
    cat /tmp/proxy_login.json 2>/dev/null || echo "No response"
fi

echo ""
echo "📊 Server Status Summary:"
echo "========================"
echo "Backend PID: $BACKEND_PID"
echo "Frontend PID: $FRONTEND_PID"
echo "Backend URL: http://localhost:5001"
echo "Frontend URL: http://localhost:3000"
echo ""
echo "🧪 Test Results:"
echo "- Backend Health: $([[ $HEALTH == "200" ]] && echo "✅ PASS" || echo "❌ FAIL")"
echo "- Backend Login: $([[ $LOGIN_RESPONSE == "200" ]] && echo "✅ PASS" || echo "❌ FAIL")"  
echo "- Proxy Health: $([[ $PROXY_HEALTH == "200" ]] && echo "✅ PASS" || echo "❌ FAIL")"
echo "- Proxy Login: $([[ $PROXY_LOGIN == "200" ]] && echo "✅ PASS" || echo "❌ FAIL")"
echo ""

if [[ $HEALTH == "200" && $LOGIN_RESPONSE == "200" && $PROXY_HEALTH == "200" && $PROXY_LOGIN == "200" ]]; then
    echo "🎉 ALL TESTS PASSED!"
    echo ""
    echo "✅ Login should now work at: http://localhost:3000"
    echo "✅ Demo credentials: fausty@fcz.app / demo123"
    echo ""
    echo "🎯 Next steps:"
    echo "1. Open http://localhost:3000 in your browser"
    echo "2. Try logging in with demo credentials"
    echo "3. Navigate to Create tab to test bet creation"
else
    echo "⚠️ SOME TESTS FAILED - Check the output above"
    echo ""
    echo "🔧 Troubleshooting:"
    if [[ $HEALTH != "200" ]]; then
        echo "- Backend health failed: Check server logs for errors"
    fi
    if [[ $LOGIN_RESPONSE != "200" ]]; then
        echo "- Backend login failed: Check database and user creation"
    fi
    if [[ $PROXY_HEALTH != "200" ]]; then
        echo "- Proxy health failed: Check Vite proxy configuration"
    fi
    if [[ $PROXY_LOGIN != "200" ]]; then
        echo "- Proxy login failed: Check proxy and backend connection"
    fi
fi

echo ""
echo "⚠️ To stop servers: kill $BACKEND_PID $FRONTEND_PID"

# Cleanup temp files
rm -f /tmp/health.json /tmp/login.json /tmp/proxy_health.json /tmp/proxy_login.json
