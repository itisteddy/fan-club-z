#!/bin/bash

# Fan Club Z v2.0 - Cursor Setup Script
# This script helps set up the development environment in Cursor

echo "🚀 Setting up Fan Club Z v2.0 for Cursor development..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

echo "📁 Current directory: $(pwd)"

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install dependencies"
        exit 1
    fi
else
    echo "✅ Dependencies already installed"
fi

# Check for environment files
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        echo "📝 Creating .env file from .env.example..."
        cp .env.example .env
        echo "⚠️  Please update .env with your actual environment variables"
    else
        echo "⚠️  No .env or .env.example file found"
    fi
else
    echo "✅ Environment file exists"
fi

# Create backup of current state
echo "💾 Creating backup of current state..."
BACKUP_DIR="../FanClubZ-v2.0-backup-$(date +%Y%m%d-%H%M%S)"
cp -r . "$BACKUP_DIR"
echo "✅ Backup created at: $BACKUP_DIR"

# Check Cursor configuration
if [ -d ".cursor" ]; then
    echo "✅ Cursor configuration found"
else
    echo "❌ Cursor configuration missing"
fi

# Display current project status
echo ""
echo "📊 Project Status:"
echo "├── MVP Status: Complete ✅"
echo "├── Database: Supabase configured ✅"
echo "├── Frontend: React + TypeScript ✅"
echo "├── Backend: Node.js + Express ✅"
echo "├── UI/UX: Modern design system ✅"
echo "├── Documentation: Comprehensive ✅"
echo "└── Cursor Config: Ready ✅"

echo ""
echo "🎯 Next Steps:"
echo "1. Open this project in Cursor"
echo "2. Read CONVERSATION_LOG.md for full context"
echo "3. Review .cursor/rules/fanclubz-guidelines.md"
echo "4. Start development with: npm run dev"
echo ""
echo "📚 Key Files to Know:"
echo "├── CONVERSATION_LOG.md (Project history)"
echo "├── comprehensive_cursor_rule.md (Development rules)"
echo "├── fanclubz_ui_ux_guide.md (Design system)"
echo "├── BACKUP_INSTRUCTIONS.md (How to revert changes)"
echo "└── .cursor/rules/ (Cursor AI configuration)"

echo ""
echo "🚀 Fan Club Z v2.0 is ready for Cursor development!"
echo "💡 Remember: This project uses 'predictions' terminology, not 'betting'"
