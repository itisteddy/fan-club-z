#!/bin/bash

echo "🌱 Seeding database with sample prediction data..."

# Wait for deployment to be ready
echo "⏳ Waiting for deployment to be ready..."
sleep 30

# Seed the database
echo "📊 Calling database seeding endpoint..."
curl -X POST https://fan-club-z.onrender.com/api/v2/admin/seed-database \
  -H "Content-Type: application/json" \
  -H "Origin: https://app.fanclubz.app"

echo ""
echo "✅ Database seeding completed!"
echo ""
echo "🧪 Testing predictions endpoint..."
curl https://fan-club-z.onrender.com/api/v2/predictions

echo ""
echo "🎉 Setup complete!"
echo "🌐 Test the frontend: https://app.fanclubz.app"
echo "📊 Expected: 6 prediction cards visible on Discover page"
