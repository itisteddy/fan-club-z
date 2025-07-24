#!/bin/bash

echo "🚀 Fan Club Z - Complete Deployment Automation"
echo "=============================================="

# Set project directory
PROJECT_DIR="/Users/efe/Library/CloudStorage/OneDrive-Personal/Fan Club Z"
cd "$PROJECT_DIR"

echo "📁 Current directory: $(pwd)"

# Step 1: Generate secure secrets automatically
echo ""
echo "🔐 Step 1: Generating secure JWT secrets..."
node -e "
const crypto = require('crypto');
const fs = require('fs');

const jwtSecret = crypto.randomBytes(64).toString('hex');
const jwtRefreshSecret = crypto.randomBytes(64).toString('hex');

console.log('✅ Generated secure secrets');

// Read current .env.production
let envContent = fs.readFileSync('.env.production', 'utf8');

// Replace placeholder secrets
envContent = envContent.replace(
  'JWT_SECRET=a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef123456789012345678901234567890abcdef12',
  \`JWT_SECRET=\${jwtSecret}\`
);

envContent = envContent.replace(
  'JWT_REFRESH_SECRET=z9y8x7w6v5u4t3s2r1q0p9o8n7m6l5k4j3i2h1g0f9e8d7c6b5a4321098765432109876543210987654321098765432109876543210987654321098765432',
  \`JWT_REFRESH_SECRET=\${jwtRefreshSecret}\`
);

fs.writeFileSync('.env.production', envContent);
console.log('✅ Updated .env.production with secure secrets');
"

# Step 2: Create git deployment branch
echo ""
echo "📦 Step 2: Creating deployment branch..."
git checkout -b deployment 2>/dev/null || git checkout deployment
git add .
git commit -m "Prepare for production deployment - $(date)" || echo "No changes to commit"

echo ""
echo "✅ AUTOMATED SETUP COMPLETE!"
echo ""
echo "📋 WHAT I'VE DONE FOR YOU:"
echo "   • ✅ Generated secure JWT secrets"
echo "   • ✅ Updated production environment"
echo "   • ✅ Created PWA manifest and service worker"
echo "   • ✅ Set up Vercel deployment config"
echo "   • ✅ Added PWA install prompt component"
echo "   • ✅ Created deployment branch"
echo "   • ✅ Created app icon (SVG format)"
echo "   • ✅ Configured Railway deployment settings"
echo ""
echo "🔄 NEXT: I NEED YOU TO DO THESE 3 THINGS:"
echo ""
echo "1. 🗄️  SET UP SUPABASE DATABASE:"
echo "   • Go to https://supabase.com"
echo "   • Create new project"
echo "   • Copy your database credentials"
echo "   • Update .env.production with:"
echo "     - DATABASE_URL"
echo "     - SUPABASE_URL"
echo "     - SUPABASE_ANON_KEY"
echo ""
echo "2. 🚂 DEPLOY BACKEND TO RAILWAY:"
echo "   • Go to https://railway.app"
echo "   • Sign up with GitHub"
echo "   • Create new project → Deploy from GitHub"
echo "   • Select this repository → Deploy from /server folder"
echo "   • Add environment variables from .env.production"
echo ""
echo "3. ⚡ DEPLOY FRONTEND TO VERCEL:"
echo "   • Go to https://vercel.com"
echo "   • Sign up with GitHub"
echo "   • Import this repository"
echo "   • Set root directory to: client"
echo "   • Set build command to: npm run build"
echo "   • Add environment variable: VITE_API_URL=[YOUR-RAILWAY-URL]/api"
echo ""
echo "📱 OPTIONAL: Convert SVG icon to PNG"
echo "   • Visit https://convertio.co/svg-png/"
echo "   • Convert client/public/icon.svg to:"
echo "     - icon-192x192.png (192x192)"
echo "     - icon-512x512.png (512x512)"
echo "     - favicon.ico (32x32)"
echo ""
echo "🎯 After you complete these steps, your app will be live!"
echo "📞 Message me when you've done these and I'll help with domain setup!"
