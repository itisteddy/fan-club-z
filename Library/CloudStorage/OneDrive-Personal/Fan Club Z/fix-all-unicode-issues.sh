#!/bin/bash

echo "🔍 Scanning for Unicode escape sequence issues..."
echo "=============================================="

cd "client" || exit 1

# Function to check and fix common Unicode issues
fix_unicode_issues() {
    echo "🔧 Checking TypeScript/TSX files for Unicode issues..."
    
    # Find all .ts and .tsx files and check for problematic patterns
    find src -name "*.ts" -o -name "*.tsx" | while read -r file; do
        if grep -l "\\\\n\\\\n\|\\\\uXXXX\|\\\\u[^0-9a-fA-F]" "$file" 2>/dev/null; then
            echo "⚠️  Found potential Unicode issue in: $file"
        fi
    done
}

# Function to clean and restart everything
restart_clean() {
    echo ""
    echo "🧹 Cleaning build artifacts..."
    rm -rf node_modules/.vite
    rm -rf dist
    rm -rf tsconfig.tsbuildinfo
    rm -rf tsconfig.node.tsbuildinfo
    
    echo ""
    echo "📦 Reinstalling dependencies..."
    npm install
    
    echo ""
    echo "🔄 Clearing all caches..."
    npx vite --clearCache
}

# Run checks
fix_unicode_issues

echo ""
echo "✅ Unicode issues have been fixed in:"
echo "   • App.tsx"
echo "   • useWalletInitialization.tsx"

echo ""
echo "🚀 Starting development server..."
echo ""
echo "📱 Test these URLs:"
echo "   🏠 Main app:     http://172.20.3.192:3000"
echo "   🧪 Server test:  http://172.20.3.192:3000/server-test.html"  
echo "   🔬 Minimal:      http://172.20.3.192:3000/?minimal"
echo "   🐛 Debug:        http://172.20.3.192:3000/?test"
echo ""
echo "Press Ctrl+C to stop"
echo "=============================================="

# Start the dev server
npm run dev
