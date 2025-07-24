#!/bin/bash

echo "🔧 Comprehensive Unicode Fix for Fan Club Z"
echo "=========================================="
echo ""

# Navigate to client directory
cd "client" || exit 1

echo "1. 🧹 Deep clean all caches and build artifacts..."
rm -rf node_modules/.vite
rm -rf node_modules/.cache
rm -rf dist
rm -rf .parcel-cache
rm -rf tsconfig.tsbuildinfo
rm -rf tsconfig.node.tsbuildinfo

echo ""
echo "2. 📝 Checking for remaining TypeScript errors..."
npx tsc --noEmit --skipLibCheck || echo "⚠️  TypeScript errors found, but continuing..."

echo ""
echo "3. 🔄 Reinstalling dependencies to ensure clean state..."
rm -rf node_modules
rm -f package-lock.json
npm install

echo ""
echo "4. 🧪 Creating emergency fallback page..."
mkdir -p public
cat > public/emergency.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Fan Club Z - Emergency Test</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            margin: 0; 
            padding: 20px; 
            background: #667eea; 
            color: white; 
            text-align: center;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .container { 
            background: rgba(0,0,0,0.2); 
            padding: 40px; 
            border-radius: 15px; 
        }
        h1 { font-size: 3em; margin-bottom: 20px; }
        .status { 
            background: #4CAF50; 
            padding: 15px; 
            border-radius: 10px; 
            margin: 20px 0; 
            font-size: 1.2em;
        }
        button {
            background: #2196F3;
            color: white;
            border: none;
            padding: 15px 30px;
            border-radius: 10px;
            font-size: 18px;
            margin: 10px;
            cursor: pointer;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎯 Fan Club Z</h1>
        <div class="status">✅ Server Connection Working</div>
        <p>If you see this page, the server is accessible from your mobile device!</p>
        <p>Server: <span id="server"></span></p>
        <p>Time: <span id="time"></span></p>
        <button onclick="location.href='/'">Try Main App</button>
        <button onclick="location.href='/?minimal'">Minimal Mode</button>
        <button onclick="location.reload()">Refresh</button>
    </div>
    <script>
        document.getElementById('server').textContent = location.host;
        document.getElementById('time').textContent = new Date().toLocaleString();
    </script>
</body>
</html>
EOF

echo "✅ Emergency fallback created at /emergency.html"

echo ""
echo "5. 🚀 Starting development server with detailed logging..."
echo ""
echo "📱 Test these URLs on your mobile device:"
echo "   🆘 Emergency test: http://172.20.3.192:3000/emergency.html"
echo "   🧪 Server test:    http://172.20.3.192:3000/server-test.html"
echo "   🔬 Minimal mode:   http://172.20.3.192:3000/?minimal"
echo "   🏠 Main app:       http://172.20.3.192:3000"
echo ""
echo "🔍 If you still see Unicode errors:"
echo "   • Try the emergency test page first"
echo "   • Check if any page loads at all"
echo "   • The issue might be in other imported files"
echo ""
echo "Press Ctrl+C to stop the server"
echo "=========================================="

# Start the development server with verbose output
NODE_ENV=development npm run dev -- --host 0.0.0.0 --port 3000 --clearCache
