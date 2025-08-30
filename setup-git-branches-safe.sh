#!/bin/bash

# Fan Club Z - Safe Git Branch Setup Script
# This script safely sets up the branch structure for multi-environment deployment

set -e  # Exit on any error

echo "🔧 Fan Club Z - Safe Git Branch Setup"
echo "======================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "client" ] || [ ! -d "server" ]; then
    print_error "This doesn't look like the Fan Club Z project directory."
    print_error "Please run this script from the project root directory."
    exit 1
fi

print_status "Found Fan Club Z project directory"

# Check if Git is initialized
if [ ! -d ".git" ]; then
    print_error "Git repository not found. Please initialize Git first:"
    print_error "git init"
    print_error "git remote add origin https://github.com/itisteddy/fan-club-z.git"
    exit 1
fi

print_status "Git repository found"

# Check current Git status
echo ""
print_info "Checking current Git status..."
git status --porcelain

# Check for uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
    echo ""
    print_warning "You have uncommitted changes!"
    print_info "Current changes:"
    git status --short
    
    echo ""
    read -p "Do you want to commit these changes before setting up branches? (y/N): " commit_changes
    
    if [[ $commit_changes =~ ^[Yy]$ ]]; then
        echo ""
        print_info "Committing current changes..."
        git add .
        git commit -m "feat: pre-branch setup commit - $(date '+%Y-%m-%d %H:%M:%S')"
        print_status "Changes committed successfully"
    else
        print_warning "Proceeding without committing changes. Make sure to commit them later."
    fi
else
    print_status "No uncommitted changes found"
fi

# Show current branch
current_branch=$(git branch | grep '*' | cut -d' ' -f2)
print_info "Current branch: $current_branch"

# Show existing branches
echo ""
print_info "Existing branches:"
git branch -a

echo ""
print_info "This script will create the following branch structure:"
echo "  main (stable production) → fanclubz.app"
echo "  ├── staging (testing) → staging.fanclubz.app"
echo "  └── development (active dev) → dev.fanclubz.app"
echo ""
print_info "Your current work will be moved to the 'development' branch"

echo ""
read -p "Do you want to proceed with branch setup? (y/N): " confirm_setup

if [[ ! $confirm_setup =~ ^[Yy]$ ]]; then
    print_error "Branch setup cancelled"
    exit 1
fi

echo ""
print_info "Starting branch setup..."

# Create main branch (if it doesn't exist)
if ! git show-ref --verify --quiet refs/heads/main; then
    print_info "Creating main branch..."
    git checkout -b main
    print_status "Main branch created"
else
    print_info "Main branch already exists, switching to it..."
    git checkout main
fi

# Push main branch
print_info "Pushing main branch to remote..."
git push -u origin main
print_status "Main branch pushed to remote"

# Create staging branch
print_info "Creating staging branch..."
git checkout -b staging
git push -u origin staging
print_status "Staging branch created and pushed"

# Create development branch (if it doesn't exist)
if ! git show-ref --verify --quiet refs/heads/development; then
    print_info "Creating development branch..."
    git checkout -b development
    print_status "Development branch created"
else
    print_info "Development branch already exists, switching to it..."
    git checkout development
fi

# Push development branch
print_info "Pushing development branch to remote..."
git push -u origin development
print_status "Development branch pushed to remote"

# Switch back to development (active development branch)
git checkout development

echo ""
print_status "Branch setup completed successfully!"
echo ""
print_info "Branch structure created:"
echo "  🌐 main → Production (fanclubz.app)"
echo "  🧪 staging → Testing (staging.fanclubz.app)"
echo "  🛠️  development → Active development (dev.fanclubz.app)"
echo ""
print_info "You are now on the 'development' branch"
print_info "This is where you'll do your daily development work"
echo ""
print_info "Next steps:"
echo "  1. Configure Vercel projects for each environment"
echo "  2. Set up custom domains (fanclubz.app, staging.fanclubz.app, dev.fanclubz.app)"
echo "  3. Use the deployment scripts:"
echo "     - npm run deploy:dev (for development)"
echo "     - npm run deploy:staging (for testing)"
echo "     - npm run deploy:production (for production)"
echo ""
print_status "Branch setup complete! 🎉"