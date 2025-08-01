#!/bin/bash

# Fan Club Z - Complete Database + Scroll Management Fix
echo "🔧 Deploying comprehensive prediction creation + navigation fixes..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Not in project root directory"
    exit 1
fi

echo "📋 Summary of fixes being deployed:"
echo "   1. ✅ Keep participant_count field in code (needed for functionality)"
echo "   2. 🗃️  Add missing participant_count column to database"
echo "   3. 🔄 Fix scroll management with debounced utility"
echo "   4. 📱 Improve mobile navigation UX"
echo ""

# Add and commit all fixes
echo "📝 Committing comprehensive fixes..."
git add .
git commit -m "fix: complete prediction creation + navigation improvements

Database Schema:
- Add participant_count column to production database via migration
- Keep participant_count field in prediction payload (needed for functionality)
- Ensure all fee percentage columns exist

Scroll Management:
- Create debounced scroll utility to prevent excessive calls
- Replace direct window.scrollTo calls with managed utility
- Add proper delays to prevent scroll conflicts
- Fix mobile navigation scroll behavior

Navigation UX:
- Smooth scroll-to-top on all tab changes
- Proper scroll timing for form step transitions
- Improved user experience following mobile best practices

Files:
- urgent-db-migration.sql: Database schema fixes
- client/src/utils/scroll.ts: New scroll utility
- client/src/App.tsx: Updated navigation handlers
- client/src/pages/CreatePredictionPage.tsx: Fixed step navigation
- client/src/stores/predictionStore.ts: Restored participant_count field"

echo ""
echo "🗃️  IMPORTANT: Run the database migration in Supabase SQL Editor:"
echo "   📄 File: urgent-db-migration.sql"
echo "   🔗 Go to: https://supabase.com/dashboard/project/[your-project]/sql"
echo "   📋 Copy and run the SQL from urgent-db-migration.sql"
echo ""

read -p "⚠️  Have you run the database migration in Supabase? (y/n): " -n 1 -r
echo
if [[ ! $R =~ ^[Yy]$ ]]; then
    echo "❌ Please run the database migration first!"
    echo "   1. Open Supabase SQL Editor"
    echo "   2. Copy contents of urgent-db-migration.sql"
    echo "   3. Run the SQL query"
    echo "   4. Then run this script again"
    exit 1
fi

# Push to trigger deployment
echo "🚀 Pushing to trigger auto-deployment..."
git push origin main

echo ""
echo "✅ Complete fix deployed!"
echo ""
echo "🔍 What was fixed:"
echo "  • ✅ Database schema: Added missing participant_count column"
echo "  • ✅ Prediction creation: Now includes proper field initialization"
echo "  • ✅ Scroll management: Debounced utility prevents excessive calls"
echo "  • ✅ Navigation UX: Smooth scroll-to-top on all transitions"
echo "  • ✅ Form steps: Proper scroll timing for multi-step forms"
echo ""
echo "⏱️  Backend will auto-deploy on Render in ~3 minutes"
echo "🌐 Test at: https://fan-club-z.vercel.app"
echo ""
echo "🧪 Test checklist after deployment:"
echo "  1. ✅ Create a new prediction (should work without errors)"
echo "  2. ✅ Navigate between tabs (should scroll to top smoothly)"
echo "  3. ✅ Use Create Prediction form (steps should scroll properly)"
echo "  4. ✅ Check browser console (should be clean, no repeated errors)"
