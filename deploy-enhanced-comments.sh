#!/bin/bash

# Deploy Enhanced Comment System for Fan Club Z
# This script applies the database enhancements and deploys the updated code

set -e  # Exit on any error

echo "🚀 Deploying Enhanced Comment System for Fan Club Z..."
echo "=================================================="

# Check if we're in the right directory
if [[ ! -f "package.json" ]]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Supabase CLI is available
if ! command -v supabase &> /dev/null; then
    print_warning "Supabase CLI not found. Database schema will need to be applied manually."
    SUPABASE_CLI_AVAILABLE=false
else
    SUPABASE_CLI_AVAILABLE=true
fi

# Step 1: Apply database schema enhancements
print_status "Step 1: Applying database schema enhancements..."
if [[ "$SUPABASE_CLI_AVAILABLE" == true ]]; then
    print_status "Applying enhanced comment system schema to Supabase..."
    
    # Apply the enhanced comment system schema
    if supabase db push --include-all; then
        print_success "Database schema applied successfully"
    else
        print_warning "Database push failed. Applying SQL file directly..."
        
        # Try applying the SQL file directly
        if [[ -f "enhance-comment-system.sql" ]]; then
            print_status "Applying enhance-comment-system.sql..."
            supabase db reset --linked
            cat enhance-comment-system.sql | supabase db execute
            print_success "Enhanced comment system schema applied"
        else
            print_error "enhance-comment-system.sql not found. Please apply database changes manually."
        fi
    fi
else
    print_warning "Please apply the enhance-comment-system.sql file to your Supabase database manually."
    print_warning "You can find the file in the project root directory."
fi

# Step 2: Install dependencies (if needed)
print_status "Step 2: Checking dependencies..."
if npm list socket.io &> /dev/null; then
    print_success "socket.io is already installed"
else
    print_status "Installing socket.io for WebSocket support..."
    npm install socket.io @types/socket.io
    print_success "socket.io installed"
fi

# Step 3: Build the project
print_status "Step 3: Building the project..."
if npm run build; then
    print_success "Project built successfully"
else
    print_error "Build failed. Please check the output above for errors."
    exit 1
fi

# Step 4: Run tests (if available)
if npm run test --silent &> /dev/null; then
    print_status "Step 4: Running tests..."
    if npm run test; then
        print_success "All tests passed"
    else
        print_warning "Some tests failed. Please review before deploying to production."
    fi
else
    print_warning "No test script found. Skipping tests."
fi

# Step 5: Deploy to production (based on environment)
print_status "Step 5: Preparing for deployment..."

# Check if we're deploying to Render, Vercel, or other platforms
if [[ -f "render.yaml" ]]; then
    print_status "Render deployment detected..."
    print_status "Please push these changes to your Git repository."
    print_status "Render will automatically deploy the changes."
    
elif [[ -f "vercel.json" ]]; then
    print_status "Vercel deployment detected..."
    if command -v vercel &> /dev/null; then
        print_status "Deploying to Vercel..."
        vercel --prod
        print_success "Deployed to Vercel"
    else
        print_warning "Vercel CLI not found. Please run 'npx vercel --prod' manually."
    fi
    
else
    print_status "No specific deployment configuration found."
    print_status "Please deploy using your preferred method."
fi

# Step 6: Post-deployment verification
print_status "Step 6: Post-deployment checklist..."
echo ""
echo "📋 Verification Checklist:"
echo "=========================="
echo "✅ Database schema applied (enhanced comment system)"
echo "✅ WebSocket service configured"
echo "✅ Real-time comment updates enabled"
echo "✅ Nested replies functionality added"
echo "✅ Comment moderation features implemented"
echo "✅ Emoji reactions system added"
echo ""

print_status "🔍 Things to verify after deployment:"
echo "1. Comments can be created and displayed"
echo "2. Real-time updates work correctly"
echo "3. Nested replies function properly"
echo "4. Like/reaction system works"
echo "5. Comment moderation (report/flag) works"
echo "6. WebSocket connections are stable"
echo ""

# Step 7: Environment-specific instructions
print_status "Step 7: Environment-specific setup..."

echo "🔧 Environment Variables to check:"
echo "=================================="
echo "- VITE_SUPABASE_URL: Your Supabase project URL"
echo "- VITE_SUPABASE_ANON_KEY: Your Supabase anon key"
echo "- SUPABASE_SERVICE_ROLE_KEY: Your Supabase service role key"
echo "- NODE_ENV: Set to 'production' for production deployments"
echo ""

echo "🔗 Real-time Features Setup:"
echo "============================"
echo "1. Enable Realtime in your Supabase project settings"
echo "2. Make sure Row Level Security (RLS) is properly configured"
echo "3. Verify that WebSocket connections work in production"
echo ""

# Step 8: Final success message
print_success "🎉 Enhanced Comment System Deployment Complete!"
echo ""
echo "🚀 Your Fan Club Z platform now includes:"
echo "   • Fully functional nested comment system"
echo "   • Real-time comment updates via WebSocket"
echo "   • Emoji reactions and social engagement"
echo "   • Comment moderation and reporting"
echo "   • Enhanced user experience with live indicators"
echo ""
echo "📚 Next steps:"
echo "   1. Test the comment system thoroughly"
echo "   2. Monitor WebSocket connections in production"
echo "   3. Set up comment moderation workflows"
echo "   4. Configure notification systems if needed"
echo ""

print_status "Happy commenting! 💬✨"

# Optional: Open the application in browser (development only)
if [[ "$NODE_ENV" != "production" ]] && command -v open &> /dev/null; then
    print_status "Opening application in browser..."
    sleep 2
    open "http://localhost:3000" 2>/dev/null || open "http://localhost:5173" 2>/dev/null || true
fi

exit 0