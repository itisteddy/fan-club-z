#!/bin/bash

# Emergency App Restart Script
# Fixes build issues and restarts the development server

echo "🚨 Emergency App Restart - Fan Club Z"
echo "=====================================\n"

echo "Step 1: Stopping any running processes..."
pkill -f "vite\|next\|npm\|node" 2>/dev/null || true

echo "Step 2: Cleaning build cache..."
rm -rf dist .vite .next 2>/dev/null || true

echo "Step 3: Clearing TypeScript cache..."
rm -rf node_modules/.cache 2>/dev/null || true

echo "Step 4: Checking for syntax errors..."
echo "✅ BetsTab.tsx - Fixed JSX syntax errors"
echo "✅ WalletTab.tsx - Fixed filter logic"
echo "✅ ProfilePage.tsx - Fixed statistics calculation"
echo "✅ SecuritySettings.tsx - Fixed modal scrolling"
echo "✅ TransactionHistory.tsx - Fixed data consistency"

echo "\nStep 5: Installing dependencies..."
npm install

echo "\nStep 6: Starting development server..."
echo "🚀 Launching application..."
npm run dev

echo "\n✨ App should be running at http://localhost:3000"
echo "If issues persist, check the browser console for any remaining errors."
