#!/bin/bash

echo "🧪 Testing builds before deployment..."

# Test server build
echo "📦 Testing server build..."
cd server
if npm run build; then
    echo "✅ Server build successful"
else
    echo "❌ Server build failed"
    exit 1
fi

# Test client build
echo "📦 Testing client build..."
cd ../client
if npm run build; then
    echo "✅ Client build successful"
else
    echo "❌ Client build failed"
    exit 1
fi

# Test shared build
echo "📦 Testing shared build..."
cd ../shared
if npm run build; then
    echo "✅ Shared build successful"
else
    echo "❌ Shared build failed"
    exit 1
fi

cd ..

echo "🎉 All builds successful! Ready for deployment."
