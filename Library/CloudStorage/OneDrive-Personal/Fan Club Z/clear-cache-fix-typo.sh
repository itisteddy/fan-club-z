#!/bin/bash

echo "🧹 Clearing potential caches and rebuilding..."
echo "==============================================="

cd "/Users/efe/Library/CloudStorage/OneDrive-Personal/Fan Club Z/client"

# Clear various caches
echo "🗑️  Clearing caches..."

# Clear npm cache
npm cache clean --force 2>/dev/null || echo "npm cache already clean"

# Clear Vite cache
rm -rf node_modules/.vite 2>/dev/null && echo "✅ Cleared Vite cache" || echo "No Vite cache to clear"

# Clear dist/build directories
rm -rf dist 2>/dev/null && echo "✅ Cleared dist directory" || echo "No dist directory"
rm -rf build 2>/dev/null && echo "✅ Cleared build directory" || echo "No build directory"

# Clear browser caches by updating any cache-related files
touch src/App.tsx
touch src/main.tsx

echo ""
echo "📝 Double-checking for typo in RegisterPage..."

# Check if the typo exists
if grep -q "First nar" src/pages/auth/RegisterPage.tsx 2>/dev/null; then
    echo "🎯 Found 'First nar' typo! Fixing it now..."
    sed -i.backup 's/First nar/First name/g' src/pages/auth/RegisterPage.tsx
    echo "✅ Fixed typo in RegisterPage.tsx"
else
    echo "✅ No 'First nar' typo found in RegisterPage.tsx"
fi

# Check all TSX files for the typo
echo ""
echo "🔍 Searching all TSX files for 'First nar'..."
find src -name "*.tsx" -exec grep -l "First nar" {} \; 2>/dev/null | while read file; do
    echo "🎯 Found typo in: $file"
    sed -i.backup 's/First nar/First name/g' "$file"
    echo "✅ Fixed typo in $file"
done

echo ""
echo "🔄 Restarting development server recommended..."
echo ""
echo "💡 If you still see 'First nar', try:"
echo "1. Hard refresh browser (Ctrl+Shift+R or Cmd+Shift+R)"
echo "2. Clear browser cache"
echo "3. Restart the dev server: npm run dev"
echo ""
echo "✅ Cache clearing complete!"
