#!/usr/bin/env node
const { execSync } = require('child_process');

function quickCommit() {
  try {
    // Check if there are changes
    const status = execSync('git status --porcelain', { encoding: 'utf8' });
    if (!status.trim()) {
      console.log('📋 No changes to commit');
      return;
    }

    console.log('📦 Changes detected:');
    console.log(status);

    // Get current branch
    const currentBranch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
    console.log(`📍 Current branch: ${currentBranch}`);

    // Analyze changes for smart commit message
    const files = status.split('\n')
      .map(line => line.trim())
      .filter(line => line)
      .map(line => line.substring(3));

    const commitMessage = generateCommitMessage(files, currentBranch);

    // Stage all changes
    console.log('📦 Staging all changes...');
    execSync('git add .');

    // Commit
    console.log(`💾 Committing: ${commitMessage}`);
    execSync(`git commit -m "${commitMessage}"`);

    console.log('✅ Changes committed successfully!');
    console.log('\n💡 To push to GitHub: npm run push-changes');

  } catch (error) {
    console.error('❌ Commit failed:', error.message);
  }
}

function generateCommitMessage(files, branch) {
  const now = new Date();
  const timestamp = now.toISOString().split('T')[0];

  // Analyze file changes to determine type
  const hasUIChanges = files.some(f => f.includes('src/') || f.includes('components/') || f.includes('.tsx') || f.includes('.css'));
  const hasBackend = files.some(f => f.includes('server/') || f.includes('api/'));
  const hasConfig = files.some(f => f.includes('package.json') || f.includes('.json') || f.includes('.js') && !f.includes('src/'));
  const hasDocs = files.some(f => f.includes('.md') || f.includes('docs/'));

  let type = 'chore';
  let scope = '';
  let description = 'update project files';

  if (hasUIChanges) {
    type = 'feat';
    scope = 'ui';
    description = 'improve user interface and components';
  } else if (hasBackend) {
    type = 'feat';
    scope = 'api';
    description = 'update backend functionality';
  } else if (hasConfig) {
    type = 'chore';
    scope = 'config';
    description = 'update configuration files';
  } else if (hasDocs) {
    type = 'docs';
    description = 'update documentation';
  }

  // Use branch name if it's a feature branch
  if (branch.includes('feature/') || branch.includes('feat/')) {
    const branchDesc = branch.split('/').slice(1).join(' ').replace(/-/g, ' ');
    description = branchDesc || description;
  }

  const message = scope ? 
    `${type}(${scope}): ${description}` : 
    `${type}: ${description}`;

  return `${message}

Auto-commit on ${timestamp}
Files: ${files.length} modified
Branch: ${branch}`;
}

quickCommit();
