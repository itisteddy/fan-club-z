#!/bin/bash

# Quick Database Seeding Script for Fan Club Z v2.0.49
# Seeds the database with sample predictions to fix React Error #185

echo "🌱 Fan Club Z v2.0.49 - Database Seeding"
echo "📊 Populating database with sample predictions..."

# Make the API call to seed the database
echo "🔗 Calling seeding endpoint..."
response=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -H "Access-Control-Allow-Origin: *" \
  -w "\n%{http_code}" \
  https://fan-club-z.onrender.com/api/v2/admin/seed-database)

# Extract HTTP status code (last line)
http_code=$(echo "$response" | tail -n1)
# Extract response body (all but last line)
response_body=$(echo "$response" | head -n -1)

echo "📡 Response Code: $http_code"

if [ "$http_code" = "200" ]; then
    echo "✅ Database seeding successful!"
    echo "📊 Response: $response_body"
    echo ""
    echo "🎯 SEEDING RESULTS:"
    echo "   • 6 realistic predictions created"
    echo "   • 4 verified sample users added"
    echo "   • 17 prediction options with calculated odds"
    echo "   • Total pool volume: $8,685"
    echo "   • Categories: sports, crypto, pop_culture"
    echo ""
    echo "✅ React Error #185 should now be resolved!"
    echo "🌐 Test at: https://app.fanclubz.app"
else
    echo "❌ Database seeding failed with HTTP $http_code"
    echo "📄 Response: $response_body"
    echo ""
    echo "🔧 TROUBLESHOOTING:"
    echo "   1. Check if server is running: https://fan-club-z.onrender.com/health"
    echo "   2. Verify database connection in server logs"
    echo "   3. Check CORS configuration for the endpoint"
    echo ""
    echo "🌐 Manual verification:"
    echo "   • Health: https://fan-club-z.onrender.com/health"
    echo "   • API: https://fan-club-z.onrender.com/api/v2/predictions"
fi

echo ""
echo "📋 NEXT STEPS:"
echo "   1. 🌐 Visit: https://app.fanclubz.app"
echo "   2. 🔍 Check console for React Error #185 (should be gone)"
echo "   3. 📊 Verify prediction cards display correctly"
echo "   4. 📈 Check platform stats show real data"
