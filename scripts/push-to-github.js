#!/usr/bin/env node
const { execSync } = require('child_process');

function pushChanges() {
  try {
    // Get current branch
    const currentBranch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
    console.log(`📍 Current branch: ${currentBranch}`);

    // Check if there are unpushed commits
    try {
      execSync(`git fetch origin ${currentBranch}`, { stdio: 'ignore' });
      const localCommits = execSync(`git rev-list origin/${currentBranch}..HEAD --count`, { encoding: 'utf8' }).trim();
      
      if (localCommits === '0') {
        console.log('📋 No unpushed commits');
        return;
      }
      
      console.log(`📤 ${localCommits} commit(s) to push`);
    } catch (e) {
      console.log('🆕 Branch not yet on remote (first push)');
    }

    // Check if remote exists
    try {
      const remotes = execSync('git remote -v', { encoding: 'utf8' });
      if (!remotes.includes('origin')) {
        console.log('❌ No origin remote configured');
        console.log('💡 Add remote first: git remote add origin <your-repo-url>');
        return;
      }
    } catch (e) {
      console.log('❌ No remotes configured');
      return;
    }

    // Push to origin
    console.log('🚀 Pushing to GitHub...');
    try {
      execSync(`git push origin ${currentBranch}`, { stdio: 'inherit' });
      console.log('✅ Successfully pushed to GitHub!');
    } catch (e) {
      // Try with upstream if it's the first push
      console.log('🔄 Setting upstream and pushing...');
      execSync(`git push -u origin ${currentBranch}`, { stdio: 'inherit' });
      console.log('✅ Successfully pushed to GitHub with upstream!');
    }

    // Show GitHub URL if possible
    try {
      const remoteUrl = execSync('git config --get remote.origin.url', { encoding: 'utf8' }).trim();
      if (remoteUrl.includes('github.com')) {
        const repoUrl = remoteUrl.replace('.git', '').replace('git@github.com:', 'https://github.com/');
        console.log(`\n🌐 View on GitHub: ${repoUrl}`);
      }
    } catch (e) {
      // Ignore if can't get URL
    }

  } catch (error) {
    console.error('❌ Push failed:', error.message);
    
    if (error.message.includes('Authentication failed') || error.message.includes('Permission denied')) {
      console.log('\n💡 Authentication tips:');
      console.log('1. Use personal access token instead of password');
      console.log('2. Configure SSH keys for easier access');
      console.log('3. Check repository permissions');
    }
  }
}

pushChanges();
