#!/bin/bash

echo "🚀 Making All Scripts Executable & Running Comprehensive Fix"
echo "============================================================="
echo ""

# Make all scripts executable
echo "1️⃣  Making scripts executable..."
chmod +x comprehensive-frontend-fix.sh 2>/dev/null || true
chmod +x fix-all-unicode.sh 2>/dev/null || true
chmod +x restart-frontend.sh 2>/dev/null || true
chmod +x restart-clean.sh 2>/dev/null || true

echo "✅ All scripts are now executable!"
echo ""

echo "2️⃣  Running comprehensive frontend fix..."
echo ""

# Run the comprehensive fix
./comprehensive-frontend-fix.sh
