#!/bin/bash

echo "🚀 Setting up Fan Club Z Production Data"
echo "========================================"

# Check if we're in the right directory
if [ ! -f "server/package.json" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

echo "📦 Installing server dependencies..."
cd server
npm install

echo "🔐 Creating real test users in Supabase..."
npm run db:create-users

echo "🌱 Seeding database with meaningful content..."
npm run db:seed

echo "✅ Production data setup completed!"
echo ""
echo "🎯 Test User Credentials:"
echo "========================="
echo "Email: admin@fanclubz.com"
echo "Password: TestPassword123!"
echo ""
echo "Email: john.doe@fanclubz.com"
echo "Password: TestPassword123!"
echo ""
echo "Email: jane.smith@fanclubz.com"
echo "Password: TestPassword123!"
echo ""
echo "Email: mike.wilson@fanclubz.com"
echo "Password: TestPassword123!"
echo ""
echo "Email: sarah.jones@fanclubz.com"
echo "Password: TestPassword123!"
echo ""
echo "🌐 Visit your app and login with any of these accounts!" 