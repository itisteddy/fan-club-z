#!/bin/bash
# Quick setup for immediate development

echo "🚀 Setting up development environment for Fan Club Z..."

# 1. Create development branch
echo "📝 Creating development branch..."
git checkout -b development 2>/dev/null || git checkout development
git push -u origin development 2>/dev/null || echo "Development branch already exists"

# 2. Install dependencies if needed
echo "📦 Checking dependencies..."
if [ ! -d "node_modules" ]; then
    npm run install:all
fi

# 3. Start development server
echo "🔧 Starting development server..."
npm run dev

echo "✅ Development environment ready!"
echo "🌐 Frontend: http://localhost:5173"
echo "🔗 Backend: http://localhost:5000"
echo ""
echo "Next steps:"
echo "1. Make your improvements"
echo "2. Test locally"
echo "3. Commit changes: npm run save-work 'your message'"
echo "4. Push to GitHub: git push origin development"
echo "5. Create PR to merge to main when ready"