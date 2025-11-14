#!/bin/bash

# Fix Stale Escrow Locks and Clean Demo Data
# Run this script from the server directory

echo "🔧 Fixing stale locks and cleaning demo data..."
echo ""

cd "$(dirname "$0")"

# Check if tsx is available
if ! command -v tsx &> /dev/null; then
    echo "❌ tsx is not installed. Installing..."
    npm install -g tsx
fi

# Run the cleanup script
tsx fix-stale-locks.ts

echo ""
echo "✅ Done! Please restart your server and refresh your frontend."
