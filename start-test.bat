@echo off
echo 🚀 Fan Club Z - Modern Testing Script
echo ======================================

cd /d "C:\Users\%USERNAME%\OneDrive\Fan Club Z v2.0\FanClubZ-version2.0"

echo 📍 Current directory: %CD%
echo.

REM Check Node version
echo 🔍 Checking Node.js version...
node --version >nul 2>&1
if %errorlevel% equ 0 (
    for /f %%i in ('node --version') do echo ✅ Node.js version: %%i
) else (
    echo ❌ Node.js not found. Please install Node.js 18+ first.
    pause
    exit /b 1
)

REM Check npm version
echo 🔍 Checking npm version...
npm --version >nul 2>&1
if %errorlevel% equ 0 (
    for /f %%i in ('npm --version') do echo ✅ npm version: %%i
) else (
    echo ❌ npm not found. Please install npm first.
    pause
    exit /b 1
)

echo.

REM Check if node_modules exists
if not exist "node_modules" (
    echo 📦 Installing dependencies...
    call npm run install:all
    if %errorlevel% neq 0 (
        echo ❌ Failed to install dependencies.
        pause
        exit /b 1
    )
    echo ✅ Dependencies installed successfully!
) else (
    echo ✅ Dependencies already installed.
)

echo.
echo 🎯 Ready to test the modernized Fan Club Z!
echo.
echo 📱 What you'll see:
echo    • Modern emerald green design (#22c55e)
echo    • Premium card layouts with shadows
echo    • Smooth animations and transitions
echo    • Mobile-first responsive design
echo    • Touch-friendly interface elements
echo.
echo 🌐 Starting development servers...
echo    • Client: http://localhost:5173
echo    • Server: http://localhost:3001
echo.
echo 💡 Tip: Open http://localhost:5173 in your browser to see the modernized app!
echo.

REM Start the development server
npm run dev

pause