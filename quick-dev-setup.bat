@echo off
REM Quick setup for immediate development on Windows

echo 🚀 Setting up development environment for Fan Club Z...

REM 1. Create development branch
echo 📝 Creating development branch...
git checkout -b development 2>nul || git checkout development
git push -u origin development 2>nul || echo Development branch already exists

REM 2. Install dependencies if needed
echo 📦 Checking dependencies...
if not exist "node_modules" (
    npm run install:all
)

REM 3. Start development server
echo 🔧 Starting development server...
npm run dev

echo ✅ Development environment ready!
echo 🌐 Frontend: http://localhost:5173
echo 🔗 Backend: http://localhost:5000
echo.
echo Next steps:
echo 1. Make your improvements
echo 2. Test locally
echo 3. Commit changes: npm run save-work "your message"
echo 4. Push to GitHub: git push origin development
echo 5. Create PR to merge to main when ready