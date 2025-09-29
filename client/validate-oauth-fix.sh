#!/bin/bash

echo "🔍 Validating OAuth Authentication Fix"
echo "====================================="

# Check if we're in the client directory
if [ ! -f "vite.config.ts" ]; then
    echo "❌ Error: Please run this script from the client directory"
    exit 1
fi

echo ""
echo "✅ Checking file modifications..."

# Check vite.config.ts for port 5174
if grep -q "port: 5174" vite.config.ts; then
    echo "✅ vite.config.ts: Port set to 5174"
else
    echo "❌ vite.config.ts: Port not set to 5174"
fi

# Check AuthSessionProvider for DEV environment variable
if grep -q "import.meta.env.DEV" src/providers/AuthSessionProvider.tsx; then
    echo "✅ AuthSessionProvider.tsx: Using DEV environment variable"
else
    echo "❌ AuthSessionProvider.tsx: Not using DEV environment variable"
fi

# Check supabase.ts for redirect configuration
if grep -q "redirectTo:" src/lib/supabase.ts; then
    echo "✅ supabase.ts: Redirect URL configuration added"
else
    echo "❌ supabase.ts: Missing redirect URL configuration"
fi

# Check AuthCallback for enhanced processing
if grep -q "OAuth callback parameters" src/pages/auth/AuthCallback.tsx; then
    echo "✅ AuthCallback.tsx: Enhanced OAuth processing implemented"
else
    echo "❌ AuthCallback.tsx: Enhanced OAuth processing missing"
fi

echo ""
echo "📋 Next Steps:"
echo "1. Update Supabase Dashboard settings (see OAUTH_FIX_SUMMARY.md)"
echo "2. Run: chmod +x test-oauth-fix.sh"
echo "3. Run: ./test-oauth-fix.sh"
echo ""
echo "📖 Full instructions in: OAUTH_FIX_SUMMARY.md"
