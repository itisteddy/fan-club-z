#!/bin/bash

echo "🔍 Running Login Diagnostics"
echo "=============================\n"

cd server

echo "📂 Current directory: $(pwd)"
echo "🗃️ Checking database file..."
if [ -f "dev.db" ]; then
    echo "✅ Database file exists ($(ls -lh dev.db | awk '{print $5}'))"
else 
    echo "❌ Database file not found"
fi

echo "\n🚀 Running diagnostics script..."
node diagnose-login-issues.mjs
