@echo off
echo 🔍 Fan Club Z - Supabase Quick Check
echo ==================================
echo.

REM Check if we're in the right directory
if not exist "package.json" (
    echo ❌ Please run this from the Fan Club Z project root directory
    exit /b 1
)

REM Check if .env file exists
if not exist ".env" (
    echo ❌ .env file not found. Please create it from .env.example
    exit /b 1
)

echo ✅ Found .env file

REM Check if node_modules exists
if not exist "node_modules" (
    echo ⚠️  node_modules not found. Installing dependencies...
    call npm install
)

echo ✅ Dependencies ready

REM Check Node.js version
for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo ✅ Node.js version: %NODE_VERSION%

echo.
echo 🧪 Testing Supabase connection...
echo Running verification script...

REM Run the verification
call node verify-supabase.js

echo.
echo 🚀 If the verification passed, you can now start the application:
echo    npm run dev
echo.
echo 🌐 Access points:
echo    - Client: http://localhost:5173
echo    - Server API: http://localhost:3001
echo    - Supabase Dashboard: https://supabase.com/dashboard/project/ihtnsyhknvltgrksffun
