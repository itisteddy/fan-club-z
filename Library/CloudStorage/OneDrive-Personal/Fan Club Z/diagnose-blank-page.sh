#!/bin/bash

echo "🔍 Diagnosing blank page issue..."
echo "================================"

# Check if we're in the right directory
if [ ! -f "client/package.json" ]; then
    echo "❌ Not in the correct directory. Please run from the project root."
    exit 1
fi

# Navigate to client directory
cd client

echo "1. 📦 Checking if dependencies are installed..."
if [ ! -d "node_modules" ]; then
    echo "❌ node_modules not found. Installing dependencies..."
    npm install
else
    echo "✅ Dependencies are installed"
fi

echo ""
echo "2. 🔧 Checking for TypeScript compilation errors..."
npx tsc --noEmit

echo ""
echo "3. 🧹 Clearing Vite cache..."
rm -rf node_modules/.vite
rm -rf dist

echo ""
echo "4. 📱 Creating a simple test page..."
cat > public/test.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Test Page</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            padding: 20px; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-align: center;
            min-height: 100vh;
            margin: 0;
            display: flex;
            flex-direction: column;
            justify-content: center;
        }
        .container {
            background: rgba(255,255,255,0.1);
            padding: 30px;
            border-radius: 15px;
            backdrop-filter: blur(10px);
        }
        h1 { font-size: 2em; margin-bottom: 20px; }
        p { font-size: 1.2em; margin: 10px 0; }
        .status { 
            background: #4CAF50; 
            padding: 10px; 
            border-radius: 8px; 
            margin: 10px 0;
            font-weight: bold;
        }
        a { 
            display: inline-block;
            background: #2196F3;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 8px;
            margin: 10px;
            font-weight: bold;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎯 Fan Club Z Test</h1>
        <div class="status">✅ Server is working!</div>
        <p>IP: <span id="ip">Loading...</span></p>
        <p>Time: <span id="time">Loading...</span></p>
        <p>User Agent: <span id="ua">Loading...</span></p>
        
        <a href="/">Go to Main App</a>
        <a href="/?test">React Test Mode</a>
    </div>

    <script>
        // Display current info
        document.getElementById('ip').textContent = window.location.host;
        document.getElementById('time').textContent = new Date().toLocaleString();
        document.getElementById('ua').textContent = navigator.userAgent;
        
        // Test fetch to backend
        fetch('/api/health')
            .then(response => response.json())
            .then(data => {
                console.log('Backend health check:', data);
            })
            .catch(error => {
                console.log('Backend not available:', error);
            });
    </script>
</body>
</html>
EOF

echo "✅ Test page created at /test.html"

echo ""
echo "5. 🚀 Starting development server..."
echo "   Access these URLs from your mobile device:"
echo "   📱 Main app: http://172.20.3.192:3000"
echo "   🧪 Test page: http://172.20.3.192:3000/test.html"
echo "   🐛 React test: http://172.20.3.192:3000/?test"
echo ""
echo "Press Ctrl+C to stop the server"
echo "================================"

npm run dev
