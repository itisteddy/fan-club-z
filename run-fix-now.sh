#!/bin/bash

# ============================================================================
# IMMEDIATE API FIX - Run this now to fix the 404 errors
# ============================================================================

echo "🚨 EMERGENCY FIX: Resolving 404 errors for social features..."

cd "/Users/efe/Library/CloudStorage/OneDrive-Personal/Fan Club Z v2.0/FanClubZ-version2.0"

# Make scripts executable
chmod +x quick-fix-social-api.sh
chmod +x fix-social-features-complete.sh

# Run the quick fix
./quick-fix-social-api.sh

echo "✅ Emergency fix applied!"
echo ""
echo "🧪 Test these endpoints now:"
echo "- Like prediction: Click heart icons on predictions"
echo "- View comments: Check comment sections" 
echo "- Add comments: Try adding new comments"
echo "- Like comments: Click heart icons on comments"
echo ""
echo "🌐 Test URL: https://app.fanclubz.app"