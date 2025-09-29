#!/bin/bash

echo "🔧 Testing OAuth Authentication Fix for Local Development"
echo "=========================================================="

# Check if we're in the right directory
if [ ! -f "vite.config.ts" ]; then
    echo "❌ Error: Please run this script from the client directory"
    exit 1
fi

# Check if .env.development.local exists
if [ ! -f ".env.development.local" ]; then
    echo "❌ Error: .env.development.local file not found"
    exit 1
fi

# Display current environment configuration
echo ""
echo "📋 Current Environment Configuration:"
echo "------------------------------------"
echo "Supabase URL: $(grep VITE_SUPABASE_URL .env.development.local | cut -d'=' -f2)"
echo "Development Port: 5174 (from vite.config.ts)"
echo ""

# Show the URLs that should be configured in Supabase
echo "🔧 Required Supabase Configuration:"
echo "-----------------------------------"
echo "1. Go to your Supabase Dashboard"
echo "2. Navigate to Authentication → URL Configuration"
echo "3. Update the following settings:"
echo ""
echo "   Site URL: http://localhost:5174"
echo "   Redirect URLs:"
echo "   - http://localhost:5174/**"
echo "   - http://localhost:5174/auth/callback"
echo ""
echo "4. In Authentication → Providers → Google:"
echo "   - Ensure Google OAuth is enabled"
echo "   - Authorized redirect URIs should include:"
echo "     https://ihtnsyhknvltgrksffun.supabase.co/auth/v1/callback"
echo ""

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Start the development server
echo "🚀 Starting development server on port 5174..."
echo "   Open your browser to: http://localhost:5174"
echo "   Click 'Continue with Google' to test OAuth flow"
echo "   Check the browser console for detailed OAuth logs"
echo ""
echo "🔍 Look for these console messages:"
echo "   - '🔐 Google OAuth redirect URL: http://localhost:5174/auth/callback'"
echo "   - '🔐 Processing OAuth callback...'"
echo "   - '✅ Session found on attempt X: [user email]'"
echo ""

# Run the dev server
npm run dev
