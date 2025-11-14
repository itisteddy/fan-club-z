#!/bin/bash
# CI Guard: Fail build if "club" appears in source code
# This ensures social/club features remain purged

echo "🔍 Checking for club/social references..."

if grep -Ri "club" client/src server/src --include="*.ts" --include="*.tsx" --include="*.js" 2>/dev/null | grep -v "// TODO"; then
  echo ""
  echo "❌ ERROR: 'club' references found in source code"
  echo "Social/club features must remain purged per TYPESCRIPT_REFACTOR_COMPLETE.md"
  exit 1
fi

if grep -Ri "social" client/src server/src --include="*.ts" --include="*.tsx" --include="*.js" 2>/dev/null | grep -v "// TODO\|Social prediction"; then
  echo ""
  echo "❌ ERROR: 'social' references found in source code"
  echo "Social/club features must remain purged per TYPESCRIPT_REFACTOR_COMPLETE.md"
  exit 1
fi

echo "✅ No club/social references found"
exit 0
