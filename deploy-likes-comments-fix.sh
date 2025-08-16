#!/bin/bash

# Fan Club Z - Deploy Likes and Comments Fix
echo "🚀 Deploying Likes and Comments fixes..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Please run this script from the project root directory"
    exit 1
fi

echo "📊 Database migration created: supabase-likes-comments-migration.sql"
echo "⚠️  Please run this migration in your Supabase SQL editor"
echo ""

# Build the client
echo "🏗️ Building client..."
if [ -d "client" ]; then
    cd client && npm run build && cd ..
    echo "✅ Client build complete"
else
    echo "⚠️  Client directory not found, skipping client build"
fi

# Build the server
echo "🏗️ Building server..."
if [ -d "server" ]; then
    cd server && npm run build && cd ..
    echo "✅ Server build complete"
else
    echo "⚠️  Server directory not found, skipping server build"
fi

echo ""
echo "✅ Build complete!"
echo ""
echo "📋 Manual steps required:"
echo "1. Run the SQL migration in Supabase SQL editor:"
echo "   File: supabase-likes-comments-migration.sql"
echo ""
echo "2. Deploy to your hosting platform (Render/Vercel):"
echo "   git add ."
echo "   git commit -m 'Fix likes and comments functionality'"
echo "   git push"
echo ""
echo "3. Test the functionality:"
echo "   - Try liking predictions"
echo "   - Test commenting on predictions"
echo "   - Verify counts update properly"
echo ""
echo "🔗 Migration file: supabase-likes-comments-migration.sql"
echo "✨ The likes and comments should now work properly!"
