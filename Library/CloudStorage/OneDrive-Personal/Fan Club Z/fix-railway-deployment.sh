# Railway deployment fix for Fan Club Z Server
echo "🚂 Fixing Railway deployment configuration..."

# Navigate to server directory  
cd "/Users/efe/Library/CloudStorage/OneDrive-Personal/Fan Club Z/server"

# Create Railway-specific package.json in server folder
cat > railway.json << 'EOF'
{
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm install && npm run build"
  },
  "deploy": {
    "startCommand": "npm start",
    "healthcheckPath": "/api/health",
    "healthcheckTimeout": 300,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 3
  }
}
EOF

# Also create a simple start script to ensure proper startup
cat > start.js << 'EOF'
// Simple start script for Railway
import('./dist/server/src/index.js').catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
EOF

echo "✅ Railway configuration fixed!"
echo "📝 Now in Railway:"
echo "   1. Delete the current failed deployment"
echo "   2. Create new project → Deploy from GitHub"  
echo "   3. IMPORTANT: Set Root Directory to 'server' (not root)"
echo "   4. Railway will auto-detect Node.js and use our config"
