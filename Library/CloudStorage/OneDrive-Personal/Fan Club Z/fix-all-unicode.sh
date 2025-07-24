#!/bin/bash

echo "🔍 Finding and Fixing All Unicode Issues"
echo "======================================="
echo ""

# Navigate to client directory
cd client/src

echo "1️⃣  Scanning for files with potential Unicode issues..."
echo ""

# List of files that commonly have Unicode issues
PROBLEM_FILES=(
  "hooks/useWalletInitialization.tsx"
  "pages/WalletTab.tsx"
  "store/walletStore.ts"
  "store/authStore.ts"
  "lib/config.ts"
  "hooks/use-toast.tsx"
  "components/ui/button.tsx"
  "components/ui/card.tsx"
)

echo "2️⃣  Backing up problem files..."
mkdir -p .backup
for file in "${PROBLEM_FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "   Backing up: $file"
    cp "$file" ".backup/$(basename $file).backup" 2>/dev/null || true
  fi
done

echo ""
echo "3️⃣  Recreating files with clean encoding..."
echo ""

# Fix each file one by one
for file in "${PROBLEM_FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "   Fixing: $file"
    
    # Remove potential BOM and convert encoding
    iconv -f UTF-8 -t UTF-8 "$file" > "${file}.tmp" 2>/dev/null || cp "$file" "${file}.tmp"
    
    # Remove any potential problematic characters
    sed 's/[^\x00-\x7F]//g' "${file}.tmp" > "${file}.clean"
    
    # Replace original file
    mv "${file}.clean" "$file"
    rm "${file}.tmp" 2>/dev/null || true
    
    echo "      ✅ Fixed: $file"
  fi
done

echo ""
echo "4️⃣  Clearing all caches..."
rm -rf node_modules/.vite 2>/dev/null || true
rm -rf .vite 2>/dev/null || true

echo ""
echo "5️⃣  Killing existing processes..."
pkill -f "vite" 2>/dev/null || true
sleep 2

echo ""
echo "6️⃣  Starting clean frontend..."
cd .. && npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅ Unicode fix complete!"
echo "🖥️  Frontend PID: $FRONTEND_PID"
echo "🌐 URL: http://localhost:3000"
echo ""
echo "⏳ Waiting 8 seconds for server to start..."
sleep 8

echo ""
echo "🧪 Testing frontend..."
curl -s http://localhost:3000 > /dev/null && echo "✅ Frontend is responding!" || echo "❌ Frontend not responding yet"

echo ""
echo "📱 Check: http://localhost:3000"
echo "🔍 Look for any remaining Unicode errors in browser console"
echo ""
echo "Press Ctrl+C to stop"

# Wait for user to stop
wait
