#!/bin/bash

echo "🔧 Fixing 'First nar' typo in RegisterPage.tsx..."
echo "================================================="

# Navigate to the file location
cd "/Users/efe/Library/CloudStorage/OneDrive-Personal/Fan Club Z/client/src/pages/auth"

# Check if the file exists and contains the typo
if [ -f "RegisterPage.tsx" ]; then
    echo "📄 Found RegisterPage.tsx"
    
    if grep -q "First nar" RegisterPage.tsx; then
        echo "🎯 Found 'First nar' typo!"
        
        # Show the line with the typo
        echo "📍 Current line with typo:"
        grep -n "First nar" RegisterPage.tsx
        
        # Fix the typo
        sed -i.backup 's/First nar/First name/g' RegisterPage.tsx
        
        echo "✅ Fixed! Changed 'First nar' to 'First name'"
        echo "📄 Backup saved as RegisterPage.tsx.backup"
        
        # Verify the fix
        echo "📍 Updated line:"
        grep -n "First name" RegisterPage.tsx | head -1
        
    else
        echo "❌ 'First nar' typo not found in RegisterPage.tsx"
        echo "🔍 Checking for similar patterns..."
        grep -n "placeholder.*First" RegisterPage.tsx
    fi
else
    echo "❌ RegisterPage.tsx not found"
fi

echo ""
echo "🎉 Registration typo fix completed!"
echo ""
echo "📋 Next steps:"
echo "1. Test the registration form to verify the fix"
echo "2. Implement the enhanced compliance screens"
echo "3. Fix the post-compliance auto-login issue"
