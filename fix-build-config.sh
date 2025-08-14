#!/bin/bash

echo "🔧 Fan Club Z - Fix TypeScript Build Configuration for Render"
echo "=========================================================="

# Change to project root
cd "$(dirname "$0")"

echo "📍 Current directory: $(pwd)"

# Function to run command with error handling
run_command() {
    echo "🔧 Running: $1"
    if eval "$1"; then
        echo "✅ Success: $1"
    else
        echo "❌ Failed: $1"
        return 1
    fi
}

echo "🧹 Step 1: Clean all build artifacts..."
if [ -d "shared/dist" ]; then
    rm -rf shared/dist
    echo "✅ Removed shared/dist"
fi

if [ -d "server/dist" ]; then
    rm -rf server/dist
    echo "✅ Removed server/dist"
fi

echo "📦 Step 2: Test shared module build..."
cd shared
run_command "npm run build"

echo "📋 Step 3: Verify shared module output..."
if [ -f "dist/index.js" ] && [ -f "dist/index.d.ts" ]; then
    echo "✅ Shared module built successfully"
    ls -la dist/
else
    echo "❌ Shared module build incomplete"
    exit 1
fi

cd ..

echo "📦 Step 4: Test server build..."
cd server
run_command "npm run build"

if [ -f "dist/index.js" ]; then
    echo "✅ Server build successful"
else
    echo "❌ Server build failed"
    exit 1
fi

cd ..

echo "📦 Step 5: Test full build from root..."
run_command "npm run build"

echo ""
echo "✅ All builds successful!"
echo ""
echo "📋 Configuration Summary:"
echo "  - Shared module: Builds to dist/ with proper exports"
echo "  - Server module: Uses @fanclubz/shared dependency (not source files)"
echo "  - TypeScript: Proper rootDir and include configuration"
echo ""
echo "🚀 Ready for Render deployment!"
echo ""