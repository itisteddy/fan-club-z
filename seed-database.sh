#!/bin/bash

# Quick Database Seeding Script
# This script runs the Node.js seeder to populate the database

echo "🚀 Fan Club Z Database Seeding"
echo "================================"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the Fan Club Z root directory"
    exit 1
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Check if seed file exists
if [ ! -f "seed-database-quick.js" ]; then
    echo "❌ Error: seed-database-quick.js not found"
    exit 1
fi

# Run the seeding script
echo "🌱 Seeding database with sample data..."
node seed-database-quick.js

# Check if seeding was successful
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Database seeding completed!"
    echo "🔗 You can now visit: https://app.fanclubz.app"
    echo "📱 The app should now show 6 sample predictions"
    echo ""
    echo "📋 Sample predictions include:"
    echo "   • Bitcoin reaching $100K prediction"
    echo "   • Taylor Swift album announcement"
    echo "   • Lakers playoffs prediction"
    echo "   • AI company valuation comparison"
    echo "   • Ethereum staking rewards"
    echo "   • Marvel movie box office"
    echo ""
    echo "🎯 Test clicking on any prediction to see details!"
else
    echo ""
    echo "❌ Database seeding failed!"
    echo "💡 Try running manually: node seed-database-quick.js"
fi
