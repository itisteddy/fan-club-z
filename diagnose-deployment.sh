#!/bin/bash

# Quick diagnosis of why Vercel is still failing
echo "🔍 Diagnosing Vercel deployment issue..."

cd "/Users/efe/Library/CloudStorage/OneDrive-Personal/Fan Club Z v2.0/FanClubZ-version2.0"

echo ""
echo "📋 Current Local Configuration (Fixed):"
echo "----------------------------------------"

echo "✅ Root package.json devDependencies:"
if grep -A 5 '"devDependencies"' package.json | grep '"vite"'; then
    echo "   ✅ Vite found in root"
else
    echo "   ❌ Vite NOT in root"
fi

echo ""
echo "✅ Workspace scripts:"
if grep '"build:client".*workspace' package.json; then
    echo "   ✅ Using workspace commands"
else
    echo "   ❌ Not using workspace commands"
fi

echo ""
echo "📋 Git Status:"
echo "-------------"
git status --porcelain

echo ""
echo "📋 Last Commit vs Current State:"
echo "--------------------------------"
echo "Last pushed commit: $(git log --oneline -1)"
echo ""

if git diff --quiet HEAD; then
    echo "✅ All changes are committed"
else
    echo "⚠️  Uncommitted changes detected - need to push!"
    echo ""
    echo "🔧 Quick fix commands:"
    echo "   chmod +x make-deploy-push-executable.sh"
    echo "   ./make-deploy-push-executable.sh"
    echo "   ./deploy-and-push-fixes.sh"
fi

echo ""
echo "🎯 Expected Vercel Success After Push:"
echo "   ✅ npm ci will install Vite at root"
echo "   ✅ npm run build:client will find vite command"
echo "   ✅ Build will complete successfully"
