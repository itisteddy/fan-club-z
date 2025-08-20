#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Setting up Fan Club Z v2.0 for GitHub...\n');

try {
  // Check if git is already initialized
  let isGitRepo = false;
  try {
    execSync('git rev-parse --git-dir', { stdio: 'ignore' });
    isGitRepo = true;
    console.log('✅ Git repository already initialized');
  } catch (e) {
    console.log('📋 Initializing Git repository...');
    execSync('git init');
    console.log('✅ Git repository initialized');
  }

  // Configure git if not already configured
  try {
    const userName = execSync('git config user.name', { encoding: 'utf8' }).trim();
    const userEmail = execSync('git config user.email', { encoding: 'utf8' }).trim();
    console.log(`📝 Git user: ${userName} <${userEmail}>`);
  } catch (e) {
    console.log('⚙️  Please configure Git user settings:');
    console.log('   git config --global user.name "Your Name"');
    console.log('   git config --global user.email "your.email@example.com"');
    return;
  }

  // Check current status
  const status = execSync('git status --porcelain', { encoding: 'utf8' });
  
  if (status.trim()) {
    console.log('📦 Staging all files...');
    execSync('git add .');
    
    // Create comprehensive initial commit
    const commitMessage = `feat: initial Fan Club Z v2.0 implementation

🎯 Complete social predictions platform with modern UI/UX

Features implemented:
- ✅ Prediction creation and management system
- ✅ User wallet with multi-currency support  
- ✅ Social engagement (clubs, comments, reactions)
- ✅ Real-time updates and notifications
- ✅ Mobile-first responsive design
- ✅ Profile system with settings management
- ✅ Modern UI components with Tailwind CSS
- ✅ Type-safe architecture with TypeScript

Technical stack:
- Frontend: React + TypeScript + Zustand + TanStack Query
- Backend: Node.js + Express + PostgreSQL + Redis
- Styling: Tailwind CSS + shadcn/ui components
- Blockchain: Smart contracts for escrow management
- Architecture: Microservices with API Gateway

UI/UX improvements:
- Fixed modal interactions and z-index issues
- Optimized prediction cards for mobile
- Enhanced form validation and error messages
- Improved toast notifications and positioning
- Complete profile management with settings

Version: 2.1.0
Status: Ready for development and testing`;

    console.log('💾 Creating initial commit...');
    execSync(`git commit -m "${commitMessage}"`);
    console.log('✅ Initial commit created');
  } else {
    console.log('📋 No changes to commit (working directory clean)');
  }

  // Check for existing remotes
  let hasRemote = false;
  try {
    const remotes = execSync('git remote -v', { encoding: 'utf8' });
    if (remotes.trim()) {
      console.log('🔗 Existing remotes:');
      console.log(remotes);
      hasRemote = true;
    }
  } catch (e) {
    // No remotes
  }

  if (!hasRemote) {
    console.log('\n🔗 To add GitHub remote, run:');
    console.log('   git remote add origin https://github.com/YOUR_USERNAME/fanclubz-v2.git');
  }

  // Show next steps
  console.log('\n🎉 Git setup complete!');
  console.log('\n📋 Next steps:');
  console.log('1. Create a new repository on GitHub named "fanclubz-v2"');
  console.log('2. Add the remote (if not already added):');
  console.log('   git remote add origin https://github.com/YOUR_USERNAME/fanclubz-v2.git');
  console.log('3. Push to GitHub:');
  console.log('   git branch -M main');
  console.log('   git push -u origin main');
  console.log('\n💡 Use these commands for ongoing development:');
  console.log('   npm run save-work     # Quick commit');
  console.log('   npm run push-changes  # Push to GitHub');
  console.log('   npm run git:status    # Check status');

} catch (error) {
  console.error('❌ Setup failed:', error.message);
  process.exit(1);
}
