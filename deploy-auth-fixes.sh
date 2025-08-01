#!/bin/bash

# Fan Club Z - Authentication Fixes Deployment Script
# This script applies critical authentication fixes to the deployed app

echo "🚀 Fan Club Z - Deploying Authentication Fixes"
echo "=============================================="

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "client" ] || [ ! -d "server" ]; then
    echo "❌ Error: Please run this script from the Fan Club Z root directory"
    exit 1
fi

echo ""
echo "📋 Summary of fixes being deployed:"
echo "  ✅ Fixed email validation regex for better email support"
echo "  ✅ Enhanced error handling and user-friendly messages"
echo "  ✅ Improved Supabase configuration with connection testing" 
echo "  ✅ Added comprehensive logging for debugging"
echo "  ✅ Better test user accounts for deployment testing"
echo ""

# Function to check if git is clean
check_git_status() {
    if [ -d ".git" ]; then
        if [ -n "$(git status --porcelain)" ]; then
            echo "⚠️  Warning: You have uncommitted changes."
            echo "   This deployment will commit and push your changes."
            echo ""
            read -p "Continue? (y/N): " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                echo "❌ Deployment cancelled."
                exit 1
            fi
        fi
    fi
}

# Function to commit and push changes
deploy_changes() {
    echo "📦 Committing authentication fixes..."
    
    if [ -d ".git" ]; then
        git add -A
        git commit -m "🔐 Fix authentication issues

- Fixed email validation regex for better compatibility
- Enhanced error handling with user-friendly messages  
- Improved Supabase configuration with connection testing
- Added comprehensive logging for debugging
- Better test user accounts and development tools

Fixes issues with:
- Email validation rejecting valid addresses
- Generic error messages confusing users
- Lack of debugging information for auth issues
- Registration and login flow improvements"

        echo "⬆️  Pushing to repository..."
        git push origin main
        
        if [ $? -eq 0 ]; then
            echo "✅ Successfully pushed to repository"
        else
            echo "❌ Error pushing to repository"
            exit 1
        fi
    else
        echo "⚠️  No git repository found. Skipping git operations."
    fi
}

# Function to trigger Vercel deployment
deploy_to_vercel() {
    echo ""
    echo "🌐 Triggering Vercel deployment..."
    
    # Check if Vercel CLI is installed
    if command -v vercel &> /dev/null; then
        echo "📤 Deploying to Vercel..."
        vercel --prod --yes
        
        if [ $? -eq 0 ]; then
            echo "✅ Frontend deployed to Vercel successfully"
        else
            echo "❌ Error deploying to Vercel"
            echo "   Please check Vercel dashboard or deploy manually"
        fi
    else
        echo "⚠️  Vercel CLI not found. Please deploy manually:"
        echo "   1. Go to Vercel dashboard"
        echo "   2. Find your Fan Club Z project"
        echo "   3. Click 'Deploy' or wait for automatic deployment"
    fi
}

# Function to trigger Render deployment
deploy_to_render() {
    echo ""
    echo "🖥️  Triggering Render deployment..."
    
    echo "ℹ️  Render will automatically deploy from the latest commit."
    echo "   Monitor your Render dashboard for deployment status:"
    echo "   https://dashboard.render.com/"
    
    # If render CLI is available (it's not common, but check anyway)
    if command -v render &> /dev/null; then
        echo "📤 Triggering Render deployment..."
        render deploy --service-id="$RENDER_SERVICE_ID" 2>/dev/null || true
    fi
}

# Function to verify deployment
verify_deployment() {
    echo ""
    echo "🔍 Deployment verification checklist:"
    echo ""
    echo "Frontend (Vercel):"
    echo "  □ Visit your Vercel app URL"
    echo "  □ Try logging in with test credentials"
    echo "  □ Check browser console for errors"
    echo "  □ Test registration flow"
    echo ""
    echo "Backend (Render):"
    echo "  □ Check Render logs for startup messages"
    echo "  □ Verify Supabase connection logs"
    echo "  □ Test API endpoints from frontend"
    echo ""
    echo "Test Credentials (use the Test Mode panel):"
    echo "  📧 test@fanclubz.com / test123"
    echo "  📧 demo@example.com / demo123"
    echo ""
    echo "If you encounter issues:"
    echo "  1. Check browser console for detailed error messages"
    echo "  2. Verify environment variables are set correctly"
    echo "  3. Check Supabase dashboard for authentication settings"
    echo "  4. Review deployment logs on Vercel/Render dashboards"
}

# Function to run tests before deployment
run_tests() {
    echo "🧪 Running pre-deployment checks..."
    
    # Check if all required files exist
    if [ ! -f "client/src/pages/auth/AuthPage.tsx" ]; then
        echo "❌ Error: AuthPage.tsx not found"
        exit 1
    fi
    
    if [ ! -f "client/src/store/authStore.ts" ]; then
        echo "❌ Error: authStore.ts not found"  
        exit 1
    fi
    
    if [ ! -f "client/src/lib/supabase.ts" ]; then
        echo "❌ Error: supabase.ts not found"
        exit 1
    fi
    
    echo "✅ All required files present"
    
    # Check environment variables
    if [ ! -f ".env" ]; then
        echo "⚠️  Warning: .env file not found"
        echo "   Make sure environment variables are set in production"
    else
        echo "✅ Environment file found"
    fi
}

# Main deployment flow
main() {
    echo "Starting deployment process..."
    
    # Run pre-deployment checks
    run_tests
    
    # Check git status
    check_git_status
    
    # Deploy changes to repository
    deploy_changes
    
    # Deploy to Vercel (frontend)
    deploy_to_vercel
    
    # Deploy to Render (backend) 
    deploy_to_render
    
    # Show verification steps
    verify_deployment
    
    echo ""
    echo "🎉 Authentication fixes deployment completed!"
    echo ""
    echo "Next steps:"
    echo "1. Wait 2-3 minutes for deployments to complete"
    echo "2. Test the application using the verification checklist above"
    echo "3. Monitor logs for any remaining issues"
    echo ""
    echo "If you need help:"
    echo "- Check the browser console for detailed error messages"
    echo "- Review SUPABASE_SETUP.md for database configuration"
    echo "- Consult DEPLOYMENT_GUIDE.md for troubleshooting"
}

# Run the main function
main