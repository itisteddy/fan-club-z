#!/bin/bash

echo "🔧 Fixing deployment issues..."

cd "/Users/efe/Library/CloudStorage/OneDrive-Personal/Fan Club Z"

# Add the build fix
git add .
git commit -m "Fix Vercel build command - remove separate tsc step"
git push origin deployment

echo "✅ Build fix pushed to GitHub!"
echo ""
echo "🔄 NEXT STEPS:"
echo ""
echo "1. VERCEL: Go back to your Vercel project and click 'Redeploy'"
echo "   The build should now succeed with the simplified build command"
echo ""
echo "2. RAILWAY: Try the web interface instead of CLI"
echo "   - Delete failed deployment"
echo "   - Create new project → Deploy from GitHub"
echo "   - Set Root Directory to 'server'"
echo ""
echo "3. Or fix npm permissions and try CLI again:"
echo "   sudo chown -R \$(whoami) \$(npm config get prefix)/{lib/node_modules,bin,share}"
echo "   npm install -g @railway/cli"
