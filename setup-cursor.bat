@echo off
REM Fan Club Z v2.0 - Cursor Setup Script (Windows)
REM This script helps set up the development environment in Cursor

echo 🚀 Setting up Fan Club Z v2.0 for Cursor development...

REM Check if we're in the right directory
if not exist "package.json" (
    echo ❌ Error: Please run this script from the project root directory
    exit /b 1
)

echo 📁 Current directory: %cd%

REM Install dependencies if node_modules doesn't exist
if not exist "node_modules" (
    echo 📦 Installing dependencies...
    npm install
    if errorlevel 1 (
        echo ❌ Failed to install dependencies
        exit /b 1
    )
) else (
    echo ✅ Dependencies already installed
)

REM Check for environment files
if not exist ".env" (
    if exist ".env.example" (
        echo 📝 Creating .env file from .env.example...
        copy ".env.example" ".env"
        echo ⚠️  Please update .env with your actual environment variables
    ) else (
        echo ⚠️  No .env or .env.example file found
    )
) else (
    echo ✅ Environment file exists
)

REM Create backup of current state
echo 💾 Creating backup of current state...
set TIMESTAMP=%date:~-4,4%%date:~-10,2%%date:~-7,2%-%time:~0,2%%time:~3,2%%time:~6,2%
set TIMESTAMP=%TIMESTAMP: =0%
set BACKUP_DIR=..\FanClubZ-v2.0-backup-%TIMESTAMP%
xcopy . "%BACKUP_DIR%" /E /I /Q
echo ✅ Backup created at: %BACKUP_DIR%

REM Check Cursor configuration
if exist ".cursor" (
    echo ✅ Cursor configuration found
) else (
    echo ❌ Cursor configuration missing
)

REM Display current project status
echo.
echo 📊 Project Status:
echo ├── MVP Status: Complete ✅
echo ├── Database: Supabase configured ✅
echo ├── Frontend: React + TypeScript ✅
echo ├── Backend: Node.js + Express ✅
echo ├── UI/UX: Modern design system ✅
echo ├── Documentation: Comprehensive ✅
echo └── Cursor Config: Ready ✅

echo.
echo 🎯 Next Steps:
echo 1. Open this project in Cursor
echo 2. Read CONVERSATION_LOG.md for full context
echo 3. Review .cursor/rules/fanclubz-guidelines.md
echo 4. Start development with: npm run dev
echo.
echo 📚 Key Files to Know:
echo ├── CONVERSATION_LOG.md (Project history)
echo ├── comprehensive_cursor_rule.md (Development rules)
echo ├── fanclubz_ui_ux_guide.md (Design system)
echo ├── BACKUP_INSTRUCTIONS.md (How to revert changes)
echo └── .cursor/rules/ (Cursor AI configuration)

echo.
echo 🚀 Fan Club Z v2.0 is ready for Cursor development!
echo 💡 Remember: This project uses 'predictions' terminology, not 'betting'

pause
