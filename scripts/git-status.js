#!/usr/bin/env node
const { execSync } = require('child_process');

function checkStatus() {
  try {
    console.log('📊 Fan Club Z v2.0 - Git Status Report\n');

    // Current branch
    const currentBranch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
    console.log(`📍 Current branch: ${currentBranch}`);

    // Working directory status
    const status = execSync('git status --porcelain', { encoding: 'utf8' });
    const hasChanges = status.trim().length > 0;
    
    console.log(`📝 Working directory: ${hasChanges ? 'HAS CHANGES' : 'CLEAN'}`);
    
    if (hasChanges) {
      console.log('\n📋 Modified files:');
      status.split('\n').filter(line => line.trim()).forEach(line => {
        const status = line.substring(0, 2);
        const file = line.substring(3);
        const statusIcon = status.includes('M') ? '📝' : 
                          status.includes('A') ? '➕' : 
                          status.includes('D') ? '❌' : 
                          status.includes('??') ? '❓' : '📄';
        console.log(`   ${statusIcon} ${file}`);
      });
    }

    // Recent commits
    try {
      console.log('\n📚 Recent commits:');
      const recentCommits = execSync('git log --oneline -5', { encoding: 'utf8' });
      recentCommits.split('\n').filter(line => line.trim()).forEach(commit => {
        console.log(`   📌 ${commit}`);
      });
    } catch (e) {
      console.log('   (No commits yet)');
    }

    // Remote status
    try {
      const remotes = execSync('git remote -v', { encoding: 'utf8' });
      if (remotes.trim()) {
        console.log('\n🔗 Remotes:');
        remotes.split('\n').filter(line => line.trim()).forEach(remote => {
          console.log(`   ${remote}`);
        });

        // Check sync status with origin
        try {
          execSync(`git fetch origin ${currentBranch}`, { stdio: 'ignore' });
          const localCommit = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
          const remoteCommit = execSync(`git rev-parse origin/${currentBranch}`, { encoding: 'utf8' }).trim();
          
          if (localCommit === remoteCommit) {
            console.log('🔄 Branch is up-to-date with origin');
          } else {
            const ahead = execSync(`git rev-list origin/${currentBranch}..HEAD --count`, { encoding: 'utf8' }).trim();
            const behind = execSync(`git rev-list HEAD..origin/${currentBranch} --count`, { encoding: 'utf8' }).trim();
            
            if (ahead > 0) console.log(`⬆️  ${ahead} commit(s) ahead of origin`);
            if (behind > 0) console.log(`⬇️  ${behind} commit(s) behind origin`);
          }
        } catch (e) {
          console.log('🆕 Branch not yet on remote');
        }
      } else {
        console.log('\n❌ No remotes configured');
        console.log('💡 Add GitHub remote: git remote add origin <repo-url>');
      }
    } catch (e) {
      console.log('❌ Error checking remotes');
    }

    // Show suggested actions
    console.log('\n💡 Suggested actions:');
    if (hasChanges) {
      console.log('   📦 npm run save-work    # Commit changes');
    }
    if (currentBranch !== 'main' && currentBranch !== 'master') {
      console.log('   🔄 git checkout main    # Switch to main branch');
    }
    try {
      const ahead = execSync(`git rev-list origin/${currentBranch}..HEAD --count`, { encoding: 'utf8' }).trim();
      if (ahead > 0) {
        console.log('   🚀 npm run push-changes # Push to GitHub');
      }
    } catch (e) {
      // Ignore if can't check
    }

  } catch (error) {
    console.error('❌ Status check failed:', error.message);
  }
}

checkStatus();
