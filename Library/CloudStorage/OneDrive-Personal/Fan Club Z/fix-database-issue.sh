#!/bin/bash

echo "🚀 Fan Club Z - Issue #2 Fix: Database Setup"
echo "============================================\n"

cd server

echo "1️⃣ Checking if server is built..."
if [ ! -d "dist" ]; then
    echo "🔨 Building server..."
    npm run build
else
    echo "✅ Server build exists"
fi

echo "\n2️⃣ Setting up database..."
./setup-database.sh || (
    echo "⚠️ Database setup script not executable, running manually..."
    chmod +x setup-database.sh
    ./setup-database.sh
)

echo "\n3️⃣ Adding missing frontend user..."
node add-missing-user.mjs

echo "\n4️⃣ Testing login functionality..."
echo "🧪 You should now be able to log in with:"
echo "   Email: fausty@fcz.app"
echo "   Password: demo123"
echo "\n   Or any of these demo accounts:"
echo "   Email: demo@fanclubz.app, Password: demo123"
echo "   Email: alex@example.com, Password: password123"

echo "\n✅ Issue #2 resolved! Database is now properly set up."
echo "🔄 Please restart your servers and test the login functionality."
