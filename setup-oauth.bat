@echo off
REM OAuth Setup Script for Fan Club Z (Windows)
REM This script will help you set up Google and Apple OAuth authentication

echo 🚀 Setting up OAuth Authentication for Fan Club Z
echo ==================================================

REM Check if we're in the right directory
if not exist "package.json" (
    echo ❌ Error: package.json not found. Please run this script from the project root directory.
    pause
    exit /b 1
)

echo 📦 Installing required OAuth dependencies...

REM Install OAuth dependencies
call npm install @supabase/auth-ui-react @supabase/auth-ui-shared

REM Install additional utilities for OAuth handling
call npm install jsonwebtoken jose

echo ✅ Dependencies installed successfully!

REM Check if .env.local exists
if not exist ".env.local" (
    echo ⚠️  .env.local not found. Creating from .env.example...
    copy ".env.example" ".env.local"
    echo ✅ Created .env.local from .env.example
    echo.
    echo 📝 Please update the following OAuth variables in .env.local:
    echo    - VITE_GOOGLE_CLIENT_ID
    echo    - GOOGLE_CLIENT_SECRET
    echo    - VITE_APPLE_CLIENT_ID
    echo    - APPLE_TEAM_ID
    echo    - APPLE_KEY_ID
    echo    - APPLE_PRIVATE_KEY
    echo.
) else (
    echo ✅ .env.local exists
)

echo 🔧 OAuth Setup Checklist:
echo =========================
echo.
echo 1. Google OAuth Setup:
echo    □ Go to Google Cloud Console (https://console.cloud.google.com/)
echo    □ Create OAuth 2.0 Client ID
echo    □ Add redirect URIs:
echo      - http://localhost:5173/auth/callback
echo      - https://your-project.supabase.co/auth/v1/callback
echo    □ Update VITE_GOOGLE_CLIENT_ID in .env.local
echo    □ Update GOOGLE_CLIENT_SECRET in .env.local
echo.
echo 2. Apple OAuth Setup:
echo    □ Go to Apple Developer Console (https://developer.apple.com/)
echo    □ Create App ID and Service ID
echo    □ Generate private key for Sign in with Apple
echo    □ Update VITE_APPLE_CLIENT_ID in .env.local
echo    □ Update APPLE_TEAM_ID in .env.local
echo    □ Update APPLE_KEY_ID in .env.local
echo    □ Update APPLE_PRIVATE_KEY in .env.local
echo.
echo 3. Supabase Configuration:
echo    □ Go to Supabase Dashboard → Authentication → Providers
echo    □ Enable Google provider and add credentials
echo    □ Enable Apple provider and add credentials
echo    □ Set redirect URLs in both providers
echo.
echo 4. Testing:
echo    □ Run 'npm run dev' to start development server
echo    □ Go to /auth page and test OAuth buttons
echo    □ Verify user creation in Supabase Auth → Users
echo.

echo 📖 For detailed setup instructions, see: OAUTH_SETUP_INSTRUCTIONS.md
echo.
echo 🎉 OAuth setup preparation complete!
echo    Next: Configure your OAuth providers and update .env.local

pause