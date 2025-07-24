#!/bin/bash

echo "🔧 Removing Unicode Characters from Store Files"
echo "============================================="
echo ""

# Navigate to client directory
cd "client" || exit 1

echo "1. Creating clean store files without Unicode emojis..."

# Backup original files
cp src/store/authStore.ts src/store/authStore.ts.backup
cp src/store/walletStore.ts src/store/walletStore.ts.backup
cp src/hooks/useWalletInitialization.tsx src/hooks/useWalletInitialization.tsx.backup

echo "✅ Original files backed up"

echo ""
echo "2. Removing Unicode characters from console.log statements..."

# Remove Unicode characters from authStore
sed -i.bak 's/🚀/[AUTH]/g; s/✅/[SUCCESS]/g; s/❌/[ERROR]/g; s/⚠️/[WARNING]/g; s/💪/[LOGOUT]/g; s/🔄/[UPDATE]/g; s/🔐/[TOKEN]/g; s/🎉/[INIT]/g' src/store/authStore.ts

# Remove Unicode characters from walletStore  
sed -i.bak 's/🚀/[WALLET]/g; s/✅/[SUCCESS]/g; s/❌/[ERROR]/g; s/💰/[BALANCE]/g; s/🎉/[INIT]/g; s/📋/[TRANSACTIONS]/g; s/🔄/[UPDATE]/g' src/store/walletStore.ts

# Remove Unicode characters from useWalletInitialization
sed -i.bak 's/🚀/[WALLET]/g; s/✅/[SUCCESS]/g; s/❌/[ERROR]/g' src/hooks/useWalletInitialization.tsx

# Clean up .bak files
rm -f src/store/*.bak src/hooks/*.bak

echo "✅ Unicode characters removed from store files"

echo ""
echo "3. Clearing all caches..."
rm -rf node_modules/.vite
rm -rf dist
rm -rf tsconfig.tsbuildinfo
rm -rf tsconfig.node.tsbuildinfo

echo ""
echo "4. Testing TypeScript compilation..."
npx tsc --noEmit --skipLibCheck

echo ""
echo "5. Starting development server..."
echo ""
echo "📱 Test these URLs on your mobile device:"
echo "   🆘 Emergency: http://172.20.3.192:3000/emergency.html"
echo "   🧪 Minimal:   http://172.20.3.192:3000/?minimal"
echo "   🏠 Main app:  http://172.20.3.192:3000"
echo ""
echo "Press Ctrl+C to stop"
echo "============================================="

npm run dev
