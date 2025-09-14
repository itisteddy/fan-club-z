#!/usr/bin/env node

/**
 * Generate Release Notes
 * Creates comprehensive release notes with links, SHAs, and rollback steps
 */

const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

function getGitInfo() {
  try {
    const commitSha = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
    const shortSha = commitSha.substring(0, 7);
    const branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
    const author = execSync('git log -1 --pretty=format:"%an"', { encoding: 'utf8' }).trim();
    const commitMessage = execSync('git log -1 --pretty=format:"%s"', { encoding: 'utf8' }).trim();
    const commitDate = execSync('git log -1 --pretty=format:"%ci"', { encoding: 'utf8' }).trim();
    
    return {
      commitSha,
      shortSha,
      branch,
      author,
      commitMessage,
      commitDate
    };
  } catch (error) {
    console.error('Error getting git info:', error.message);
    return null;
  }
}

function getVersion() {
  try {
    const packagePath = path.join(__dirname, '..', 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    return packageJson.version;
  } catch (error) {
    console.error('Error reading version:', error.message);
    return 'unknown';
  }
}

function getRecentCommits(limit = 20) {
  try {
    const commits = execSync(`git log --oneline -${limit} --pretty=format:"%h|%an|%s|%ci"`, { encoding: 'utf8' })
      .trim()
      .split('\n')
      .map(line => {
        const [hash, author, message, date] = line.split('|');
        return { hash, author, message, date };
      });
    
    return commits;
  } catch (error) {
    console.error('Error getting recent commits:', error.message);
    return [];
  }
}

function getChangedFiles() {
  try {
    const files = execSync('git diff --name-only HEAD~1', { encoding: 'utf8' })
      .trim()
      .split('\n')
      .filter(file => file.length > 0);
    
    return files;
  } catch (error) {
    console.error('Error getting changed files:', error.message);
    return [];
  }
}

function categorizeFiles(files) {
  const categories = {
    'Frontend': files.filter(f => f.startsWith('client/')),
    'Backend': files.filter(f => f.startsWith('server/')),
    'Shared': files.filter(f => f.startsWith('shared/')),
    'Documentation': files.filter(f => f.endsWith('.md') || f.includes('docs/')),
    'Configuration': files.filter(f => f.includes('.json') || f.includes('.yaml') || f.includes('.yml')),
    'Scripts': files.filter(f => f.startsWith('scripts/')),
    'CI/CD': files.filter(f => f.includes('.github/') || f.includes('workflows/')),
    'Other': files.filter(f => !f.startsWith('client/') && !f.startsWith('server/') && 
                              !f.startsWith('shared/') && !f.startsWith('scripts/') && 
                              !f.includes('docs/') && !f.includes('.json') && 
                              !f.includes('.yaml') && !f.includes('.yml') && 
                              !f.includes('.github/'))
  };
  
  return categories;
}

function generateReleaseNotes() {
  const version = getVersion();
  const gitInfo = getGitInfo();
  const recentCommits = getRecentCommits();
  const changedFiles = getChangedFiles();
  const categorizedFiles = categorizeFiles(changedFiles);
  
  if (!gitInfo) {
    console.error('❌ Failed to get git information');
    process.exit(1);
  }
  
  const releaseNotes = `# Release Notes - v${version}

## 🚀 Release Information
- **Version:** ${version}
- **Release Date:** ${new Date().toISOString().split('T')[0]}
- **Branch:** ${gitInfo.branch}
- **Commit:** [${gitInfo.shortSha}](https://github.com/itisteddy/fan-club-z/commit/${gitInfo.commitSha})
- **Author:** ${gitInfo.author}

## 📋 Release Summary
${gitInfo.commitMessage}

## 🔗 Deployment Links
- **Production Frontend:** https://app.fanclubz.app
- **Production Backend:** https://fan-club-z.onrender.com
- **GitHub Release:** https://github.com/itisteddy/fan-club-z/releases/tag/v${version}

## 📊 Changes in this Release
${Object.entries(categorizedFiles)
  .filter(([category, files]) => files.length > 0)
  .map(([category, files]) => `### ${category} (${files.length} files)
${files.map(file => `- ${file}`).join('\n')}`)
  .join('\n\n')}

## 📝 Recent Commits
${recentCommits.slice(0, 10).map(commit => 
  `- [${commit.hash}](https://github.com/itisteddy/fan-club-z/commit/${commit.hash}) ${commit.message} (${commit.author})`
).join('\n')}

## 🔄 Rollback Instructions

### Quick Rollback (if needed immediately)
\`\`\`bash
# Revert the latest commit
git revert ${gitInfo.commitSha}

# Push the revert
git push origin main
\`\`\`

### Manual Rollback Steps
1. **Identify the last stable commit:**
   \`\`\`bash
   git log --oneline -10
   \`\`\`

2. **Revert to previous stable version:**
   \`\`\`bash
   git revert ${gitInfo.commitSha}
   git push origin main
   \`\`\`

3. **Monitor deployment:**
   - Check Vercel deployment status
   - Check Render deployment status
   - Run smoke tests: \`npm run smoke:prod\`

4. **Verify rollback:**
   - Test critical functionality
   - Check error rates
   - Monitor performance metrics

### Emergency Contact
- **DevOps Team:** [Contact Information]
- **On-call Engineer:** [Contact Information]

## 🧪 Testing Checklist
- [ ] **Frontend Tests:** All UI components working
- [ ] **Backend Tests:** All API endpoints responding
- [ ] **Integration Tests:** Frontend-backend communication
- [ ] **Performance Tests:** Page load times acceptable
- [ ] **Security Tests:** No vulnerabilities introduced
- [ ] **Browser Tests:** Cross-browser compatibility
- [ ] **Mobile Tests:** Mobile responsiveness
- [ ] **Accessibility Tests:** WCAG compliance

## 📈 Monitoring
- **Application Health:** Monitor error rates and response times
- **User Metrics:** Track user engagement and conversion rates
- **Performance:** Monitor Core Web Vitals
- **Security:** Watch for security alerts and anomalies

## 🔍 Post-Deployment Verification
1. **Health Checks:**
   - [ ] Frontend loads successfully
   - [ ] Backend API responds
   - [ ] Database connections stable
   - [ ] Authentication working
   - [ ] Payment processing functional

2. **Feature Verification:**
   - [ ] User registration/login
   - [ ] Prediction creation/viewing
   - [ ] Comment system
   - [ ] Wallet functionality
   - [ ] Admin features

3. **Performance Checks:**
   - [ ] Page load times < 3 seconds
   - [ ] API response times < 500ms
   - [ ] Database query performance
   - [ ] Memory usage stable

---

**Generated:** ${new Date().toISOString()}
**Workflow:** [View Deployment](https://github.com/itisteddy/fan-club-z/actions)
`;

  return releaseNotes;
}

function main() {
  try {
    const version = getVersion();
    const releaseNotes = generateReleaseNotes();
    
    // Ensure .artifacts directory exists
    const artifactsDir = path.join(__dirname, '..', '.artifacts');
    if (!fs.existsSync(artifactsDir)) {
      fs.mkdirSync(artifactsDir, { recursive: true });
    }
    
    // Write release notes
    const outputPath = path.join(artifactsDir, `release-notes-v${version}.md`);
    fs.writeFileSync(outputPath, releaseNotes);
    
    console.log(`✅ Release notes generated: ${outputPath}`);
    console.log(`📋 Version: ${version}`);
    console.log(`📄 Release notes saved to: .artifacts/release-notes-v${version}.md`);
    
  } catch (error) {
    console.error('❌ Error generating release notes:', error.message);
    process.exit(1);
  }
}

main();
