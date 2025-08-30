# Git Workflow & Versioning Automation for Cursor AI
*Practical Implementation Guide*

## Overview
This guide provides automated tools and clear instructions for Cursor AI to handle git workflows and versioning without manual intervention.

---

## 1. Automated Git Workflow Setup

### Package.json Scripts
Add these scripts to your `package.json` to automate common git operations:

```json
{
  "scripts": {
    "git:status": "git status --porcelain",
    "git:feature": "node scripts/create-feature-branch.js",
    "git:commit": "node scripts/smart-commit.js",
    "git:push": "node scripts/safe-push.js",
    "git:merge": "node scripts/merge-to-develop.js",
    "version:patch": "node scripts/bump-version.js patch",
    "version:minor": "node scripts/bump-version.js minor",
    "version:major": "node scripts/bump-version.js major",
    "release:create": "node scripts/create-release.js",
    "branch:cleanup": "node scripts/cleanup-branches.js"
  }
}
```

### Automated Branch Creation Script
```javascript
// scripts/create-feature-branch.js
const { execSync } = require('child_process');
const readline = require('readline');

async function createFeatureBranch() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  try {
    // Get current branch
    const currentBranch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
    
    if (currentBranch !== 'develop') {
      console.log('⚠️  Switching to develop branch first...');
      execSync('git checkout develop');
      execSync('git pull origin develop');
    }

    // Get feature details
    const featureType = await question(rl, 'Feature type (feature/bugfix/hotfix): ');
    const ticketId = await question(rl, 'Ticket ID (e.g., FCZ-123): ');
    const description = await question(rl, 'Brief description (kebab-case): ');

    const branchName = `${featureType}/${ticketId}-${description}`;
    
    // Create and switch to branch
    execSync(`git checkout -b ${branchName}`);
    console.log(`✅ Created and switched to branch: ${branchName}`);
    
    // Push to origin
    execSync(`git push -u origin ${branchName}`);
    console.log(`✅ Branch pushed to origin`);

  } catch (error) {
    console.error('❌ Error creating branch:', error.message);
  } finally {
    rl.close();
  }
}

function question(rl, query) {
  return new Promise(resolve => rl.question(query, resolve));
}

createFeatureBranch();
```

### Smart Commit Script
```javascript
// scripts/smart-commit.js
const { execSync } = require('child_process');
const fs = require('fs');

function smartCommit() {
  try {
    // Check if there are changes
    const status = execSync('git status --porcelain', { encoding: 'utf8' });
    if (!status.trim()) {
      console.log('📋 No changes to commit');
      return;
    }

    // Get current branch to determine commit type
    const currentBranch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
    const branchParts = currentBranch.split('/');
    
    let commitType = 'feat';
    if (branchParts[0] === 'bugfix') commitType = 'fix';
    if (branchParts[0] === 'hotfix') commitType = 'fix';
    
    // Analyze changed files to suggest scope
    const changedFiles = status.split('\n')
      .map(line => line.trim().substring(3))
      .filter(file => file);
    
    const scope = inferScope(changedFiles);
    
    // Generate commit message based on branch name
    const description = branchParts.length > 1 ? 
      branchParts.slice(1).join('-').replace(/-/g, ' ') : 
      'update code';
    
    const commitMessage = `${commitType}${scope ? `(${scope})` : ''}: ${description}`;
    
    // Stage all changes
    execSync('git add .');
    
    // Commit with generated message
    execSync(`git commit -m "${commitMessage}"`);
    
    console.log(`✅ Committed: ${commitMessage}`);
    
    // Auto-push if on feature branch
    if (branchParts[0] === 'feature' || branchParts[0] === 'bugfix') {
      execSync(`git push origin ${currentBranch}`);
      console.log(`✅ Pushed to origin/${currentBranch}`);
    }

  } catch (error) {
    console.error('❌ Commit failed:', error.message);
  }
}

function inferScope(files) {
  const scopes = {
    'client/': 'frontend',
    'server/': 'backend',
    'shared/': 'shared',
    'smart-contracts/': 'contracts',
    'docs/': 'docs',
    'tests/': 'tests',
    'package.json': 'deps'
  };

  for (const [path, scope] of Object.entries(scopes)) {
    if (files.some(file => file.startsWith(path))) {
      return scope;
    }
  }
  
  return null;
}

smartCommit();
```

### Version Bumping Script
```javascript
// scripts/bump-version.js
const fs = require('fs');
const { execSync } = require('child_process');

function bumpVersion(type = 'patch') {
  try {
    // Read current version
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const currentVersion = packageJson.version;
    
    // Calculate new version
    const [major, minor, patch] = currentVersion.split('.').map(Number);
    let newVersion;
    
    switch (type) {
      case 'major':
        newVersion = `${major + 1}.0.0`;
        break;
      case 'minor':
        newVersion = `${major}.${minor + 1}.0`;
        break;
      case 'patch':
      default:
        newVersion = `${major}.${minor}.${patch + 1}`;
        break;
    }
    
    // Update package.json
    packageJson.version = newVersion;
    fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2));
    
    // Update other version files
    updateVersionFiles(newVersion);
    
    // Commit version bump
    execSync('git add .');
    execSync(`git commit -m "chore: bump version to ${newVersion}"`);
    execSync(`git tag v${newVersion}`);
    
    console.log(`✅ Version bumped to ${newVersion}`);
    console.log(`✅ Tagged as v${newVersion}`);
    
    return newVersion;

  } catch (error) {
    console.error('❌ Version bump failed:', error.message);
  }
}

function updateVersionFiles(version) {
  // Update client package.json
  if (fs.existsSync('client/package.json')) {
    const clientPackage = JSON.parse(fs.readFileSync('client/package.json', 'utf8'));
    clientPackage.version = version;
    fs.writeFileSync('client/package.json', JSON.stringify(clientPackage, null, 2));
  }
  
  // Update server package.json
  if (fs.existsSync('server/package.json')) {
    const serverPackage = JSON.parse(fs.readFileSync('server/package.json', 'utf8'));
    serverPackage.version = version;
    fs.writeFileSync('server/package.json', JSON.stringify(serverPackage, null, 2));
  }
  
  // Update version constant file
  const versionContent = `export const VERSION = '${version}';\nexport const BUILD_DATE = '${new Date().toISOString()}';\n`;
  fs.writeFileSync('shared/version.ts', versionContent);
}

const versionType = process.argv[2] || 'patch';
bumpVersion(versionType);
```

### Release Creation Script
```javascript
// scripts/create-release.js
const { execSync } = require('child_process');
const fs = require('fs');

function createRelease() {
  try {
    // Ensure we're on develop
    const currentBranch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
    if (currentBranch !== 'develop') {
      console.log('⚠️  Switching to develop branch...');
      execSync('git checkout develop');
      execSync('git pull origin develop');
    }
    
    // Get next version
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const currentVersion = packageJson.version;
    const nextVersion = getNextVersion(currentVersion);
    
    // Create release branch
    const releaseBranch = `release/${nextVersion}`;
    execSync(`git checkout -b ${releaseBranch}`);
    
    // Bump version
    execSync(`npm run version:minor`);
    
    // Update changelog
    updateChangelog(nextVersion);
    
    // Commit release preparation
    execSync('git add .');
    execSync(`git commit -m "chore: prepare release ${nextVersion}"`);
    
    // Push release branch
    execSync(`git push -u origin ${releaseBranch}`);
    
    console.log(`✅ Release branch created: ${releaseBranch}`);
    console.log(`📋 Next steps:`);
    console.log(`   1. Test the release branch`);
    console.log(`   2. Create PR to main branch`);
    console.log(`   3. After merge, tag and deploy`);

  } catch (error) {
    console.error('❌ Release creation failed:', error.message);
  }
}

function getNextVersion(current) {
  const [major, minor, patch] = current.split('.').map(Number);
  return `${major}.${minor + 1}.0`;
}

function updateChangelog(version) {
  const date = new Date().toISOString().split('T')[0];
  const changelogEntry = `\n## [${version}] - ${date}\n\n### Added\n- New features added in this release\n\n### Changed\n- Improvements and changes\n\n### Fixed\n- Bug fixes\n\n### Security\n- Security improvements\n\n`;
  
  if (fs.existsSync('CHANGELOG.md')) {
    const changelog = fs.readFileSync('CHANGELOG.md', 'utf8');
    const updatedChangelog = changelog.replace('# Changelog\n', `# Changelog${changelogEntry}`);
    fs.writeFileSync('CHANGELOG.md', updatedChangelog);
  } else {
    fs.writeFileSync('CHANGELOG.md', `# Changelog${changelogEntry}`);
  }
}

createRelease();
```

---

## 2. Cursor AI Instructions

### Daily Workflow Commands for AI
Create these as standard operating procedures:

```bash
# 1. Starting new work
npm run git:feature
# AI should run this and follow prompts for branch creation

# 2. Regular commits during development
npm run git:commit
# AI should run this frequently to auto-commit with proper messages

# 3. When feature is complete
npm run git:merge
# AI should run this to merge feature back to develop

# 4. For bug fixes
git checkout develop
git checkout -b bugfix/FCZ-XXX-description
# Make changes
npm run git:commit
npm run git:merge

# 5. For releases (when ready)
npm run release:create
```

### AI Workflow Decision Tree
```
Is this a new feature/bug fix?
├── YES → Run `npm run git:feature`
│   ├── Make changes
│   ├── Run `npm run git:commit` frequently
│   └── When done → Run `npm run git:merge`
└── NO → Are you updating existing feature?
    ├── YES → Make changes → Run `npm run git:commit`
    └── NO → Check current branch with `git branch`
```

### Branch Status Checker
```javascript
// scripts/check-git-status.js
const { execSync } = require('child_process');

function checkGitStatus() {
  try {
    const currentBranch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
    const status = execSync('git status --porcelain', { encoding: 'utf8' });
    const hasUncommitted = status.trim().length > 0;
    
    console.log(`📍 Current branch: ${currentBranch}`);
    console.log(`📝 Uncommitted changes: ${hasUncommitted ? 'YES' : 'NO'}`);
    
    if (hasUncommitted) {
      console.log('💡 Run `npm run git:commit` to commit changes');
    }
    
    // Check if branch is up to date with origin
    try {
      execSync(`git fetch origin ${currentBranch}`);
      const localCommit = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
      const remoteCommit = execSync(`git rev-parse origin/${currentBranch}`, { encoding: 'utf8' }).trim();
      
      if (localCommit !== remoteCommit) {
        console.log('⚠️  Branch is not in sync with origin');
        console.log('💡 Run `git pull origin ' + currentBranch + '` to sync');
      }
    } catch (e) {
      console.log('💡 Branch not yet pushed to origin');
    }

  } catch (error) {
    console.error('❌ Git status check failed:', error.message);
  }
}

checkGitStatus();
```

---

## 3. Simple AI Commands

### For Cursor AI to Use
Create these simple commands that AI can easily remember and use:

```json
{
  "scripts": {
    "start-work": "node scripts/check-git-status.js && echo 'Ready to code!'",
    "save-work": "npm run git:commit",
    "new-feature": "npm run git:feature",
    "finish-feature": "npm run git:merge",
    "quick-status": "git status && git branch",
    "sync": "git pull origin develop"
  }
}
```

### AI Instruction Template
When instructing Cursor AI, use this format:

```
BEFORE starting any work:
1. Run: npm run quick-status
2. If not on develop: run git checkout develop
3. If starting new feature: run npm run new-feature
4. If continuing work: run npm run start-work

DURING work:
- After completing a logical chunk: run npm run save-work
- Check status frequently: npm run quick-status

WHEN finished:
- Run: npm run finish-feature
- Verify: npm run quick-status
```

---

## 4. Git Hooks for Safety

### Pre-commit Hook
```bash
#!/bin/sh
# .git/hooks/pre-commit

echo "🔍 Running pre-commit checks..."

# Run tests
npm run test:quick
if [ $? -ne 0 ]; then
  echo "❌ Tests failed. Commit aborted."
  exit 1
fi

# Run linting
npm run lint
if [ $? -ne 0 ]; then
  echo "❌ Linting failed. Commit aborted."
  exit 1
fi

# Type check
npm run type-check
if [ $? -ne 0 ]; then
  echo "❌ Type check failed. Commit aborted."
  exit 1
fi

echo "✅ Pre-commit checks passed"
```

### Pre-push Hook
```bash
#!/bin/sh
# .git/hooks/pre-push

echo "🚀 Running pre-push checks..."

# Get the current branch
current_branch=$(git rev-parse --abbrev-ref HEAD)

# Prevent direct push to main/master
if [ "$current_branch" = "main" ] || [ "$current_branch" = "master" ]; then
  echo "❌ Direct push to main/master is not allowed"
  echo "💡 Use pull requests for main branch"
  exit 1
fi

# Run full test suite for develop branch
if [ "$current_branch" = "develop" ]; then
  npm run test
  if [ $? -ne 0 ]; then
    echo "❌ Full test suite failed. Push aborted."
    exit 1
  fi
fi

echo "✅ Pre-push checks passed"
```

---

## 5. Setup Instructions

### One-time Setup
Run this script to set up all automation:

```bash
#!/bin/bash
# setup-git-automation.sh

echo "🔧 Setting up Git automation for Fan Club Z..."

# Create scripts directory
mkdir -p scripts

# Copy all automation scripts (the ones above)
# ... (scripts would be copied here)

# Make scripts executable
chmod +x scripts/*.js

# Set up git hooks
cp hooks/pre-commit .git/hooks/
cp hooks/pre-push .git/hooks/
chmod +x .git/hooks/*

# Install commitizen for better commit messages
npm install -g commitizen cz-conventional-changelog

echo "✅ Git automation setup complete!"
echo "📋 Available commands:"
echo "  npm run new-feature    - Start new feature"
echo "  npm run save-work      - Commit current work"
echo "  npm run finish-feature - Merge feature to develop"
echo "  npm run quick-status   - Check git status"
```

---

## 6. Emergency Commands

### For AI When Things Go Wrong
```bash
# If AI gets confused about branches:
git branch -a
git status

# If AI needs to reset to develop:
git stash
git checkout develop
git pull origin develop

# If AI made a mistake in commit:
git reset --soft HEAD~1  # Undo last commit but keep changes

# If AI needs to see recent commits:
git log --oneline -10

# If AI needs to see what changed:
git diff HEAD~1
```

This automation setup ensures that Cursor AI can handle git workflows and versioning safely without needing to understand the complex underlying git concepts. The AI just needs to run the appropriate npm scripts, and everything else is handled automatically.