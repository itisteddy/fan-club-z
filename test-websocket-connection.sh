#!/bin/bash

# Test WebSocket Connection to Render
echo "🧪 Testing WebSocket Connection to Render Server"
echo "==============================================="

RENDER_URL="https://fan-club-z.onrender.com"

echo "🔗 Testing server health..."
curl -s "$RENDER_URL/health" | jq . || echo "❌ Health check failed"

echo ""
echo "🔌 Testing WebSocket endpoint..."
curl -s "$RENDER_URL/ws" | jq . || echo "❌ WebSocket endpoint failed"

echo ""
echo "🔍 Testing Socket.IO health..."
curl -s "$RENDER_URL/socket.io/health" | jq . || echo "❌ Socket.IO health check failed"

echo ""
echo "📊 If all tests pass, WebSocket should work from browser"
echo "🌐 Test URL: https://fan-club-z-lu5ywnjr0-teddys-projects-d67ab22a.vercel.app"
