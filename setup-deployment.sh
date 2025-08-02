#!/bin/bash

# Make deployment scripts executable
echo "🔧 Setting up deployment permissions..."

chmod +x deploy-dev.sh
chmod +x deploy-staging.sh 
chmod +x deploy-production.sh

echo "✅ Deployment scripts are now executable!"
echo ""
echo "Available commands:"
echo "  npm run deploy:dev        - Deploy development to dev environment"
echo "  npm run deploy:staging    - Deploy to staging environment"
echo "  npm run deploy:production - Deploy to production (fanclubz.app)"
echo "  npm run setup:branches    - Set up git branches for deployment"