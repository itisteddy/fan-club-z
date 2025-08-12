#!/bin/bash

# OAuth Setup Script for Fan Club Z
# This script will help you set up Google and Apple OAuth authentication

set -e

echo "🚀 Setting up OAuth Authentication for Fan Club Z"
echo "=================================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the project root directory."
    exit 1
fi

echo "📦 Installing required OAuth dependencies..."

# Install OAuth dependencies
npm install @supabase/auth-ui-react @supabase/auth-ui-shared

# Install additional utilities for OAuth handling
npm install jsonwebtoken jose

echo "✅ Dependencies installed successfully!"

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo "⚠️  .env.local not found. Creating from .env.example..."
    cp .env.example .env.local
    echo "✅ Created .env.local from .env.example"
    echo ""
    echo "📝 Please update the following OAuth variables in .env.local:"
    echo "   - VITE_GOOGLE_CLIENT_ID"
    echo "   - GOOGLE_CLIENT_SECRET"
    echo "   - VITE_APPLE_CLIENT_ID"
    echo "   - APPLE_TEAM_ID"
    echo "   - APPLE_KEY_ID"
    echo "   - APPLE_PRIVATE_KEY"
    echo ""
else
    echo "✅ .env.local exists"
fi

echo "🔧 OAuth Setup Checklist:"
echo "========================="
echo ""
echo "1. Google OAuth Setup:"
echo "   □ Go to Google Cloud Console (https://console.cloud.google.com/)"
echo "   □ Create OAuth 2.0 Client ID"
echo "   □ Add redirect URIs:"
echo "     - http://localhost:5173/auth/callback"
echo "     - https://your-project.supabase.co/auth/v1/callback"
echo "   □ Update VITE_GOOGLE_CLIENT_ID in .env.local"
echo "   □ Update GOOGLE_CLIENT_SECRET in .env.local"
echo ""
echo "2. Apple OAuth Setup:"
echo "   □ Go to Apple Developer Console (https://developer.apple.com/)"
echo "   □ Create App ID and Service ID"
echo "   □ Generate private key for Sign in with Apple"
echo "   □ Update VITE_APPLE_CLIENT_ID in .env.local"
echo "   □ Update APPLE_TEAM_ID in .env.local"
echo "   □ Update APPLE_KEY_ID in .env.local"
echo "   □ Update APPLE_PRIVATE_KEY in .env.local"
echo ""
echo "3. Supabase Configuration:"
echo "   □ Go to Supabase Dashboard → Authentication → Providers"
echo "   □ Enable Google provider and add credentials"
echo "   □ Enable Apple provider and add credentials"
echo "   □ Set redirect URLs in both providers"
echo ""
echo "4. Testing:"
echo "   □ Run 'npm run dev' to start development server"
echo "   □ Go to /auth page and test OAuth buttons"
echo "   □ Verify user creation in Supabase Auth → Users"
echo ""

# Check if required environment variables are set
echo "🔍 Checking environment variables..."

if grep -q "VITE_GOOGLE_CLIENT_ID=your-google-client-id" .env.local 2>/dev/null; then
    echo "⚠️  VITE_GOOGLE_CLIENT_ID needs to be updated"
fi

if grep -q "VITE_APPLE_CLIENT_ID=your.apple.service.id" .env.local 2>/dev/null; then
    echo "⚠️  VITE_APPLE_CLIENT_ID needs to be updated"
fi

echo ""
echo "📖 For detailed setup instructions, see: OAUTH_SETUP_INSTRUCTIONS.md"
echo ""
echo "🎉 OAuth setup preparation complete!"
echo "   Next: Configure your OAuth providers and update .env.local"