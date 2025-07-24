#!/bin/bash

echo "🔍 Searching for registration typo 'First nar'..."
echo "=================================================="

cd "$(dirname "$0")"

# Search for the typo in TypeScript and JavaScript files
echo "Searching in client/src directory..."
found_files=$(find client/src -name "*.tsx" -o -name "*.ts" -o -name "*.jsx" -o -name "*.js" | xargs grep -l "First nar" 2>/dev/null)

if [ -z "$found_files" ]; then
    echo "❌ No files found with 'First nar' typo"
    echo ""
    echo "🔍 Searching for registration-related files that might contain the form..."
    
    # Look for files that might contain registration forms
    registration_files=$(find client/src -name "*.tsx" -o -name "*.ts" | xargs grep -l -i "first.*name\|register\|signup\|create.*account" 2>/dev/null | head -10)
    
    if [ ! -z "$registration_files" ]; then
        echo "📋 Found registration-related files:"
        echo "$registration_files" | while read file; do
            echo "  - $file"
        done
        
        echo ""
        echo "💡 Manually check these files for the 'First nar' typo and replace with 'First name'"
    fi
else
    echo "🎯 Found files with 'First nar' typo:"
    echo "$found_files" | while read file; do
        echo "  - $file"
        
        # Show the line with the typo
        grep -n "First nar" "$file" | while read line; do
            echo "    Line: $line"
        done
        echo ""
    done
    
    echo "🔧 To fix the typo, run:"
    echo "$found_files" | while read file; do
        echo "  sed -i 's/First nar/First name/g' \"$file\""
    done
fi

echo ""
echo "📝 Other things to check:"
echo "1. Make sure compliance screens use the new ComplianceScreen component"
echo "2. Verify onboarding flow sets hasCompletedOnboarding: true"
echo "3. Test that users don't need to log in again after compliance"
echo ""
