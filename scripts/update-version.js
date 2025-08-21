#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Colors for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function getCurrentVersion() {
  try {
    const versionPath = path.join(process.cwd(), 'shared/src/version.ts');
    const content = fs.readFileSync(versionPath, 'utf8');
    const match = content.match(/VERSION\s*=\s*["']([^"']+)["']/);
    return match ? match[1] : null;
  } catch (error) {
    return null;
  }
}

function incrementVersion(version, type = 'patch') {
  const parts = version.split('.').map(Number);
  
  switch (type) {
    case 'major':
      parts[0]++;
      parts[1] = 0;
      parts[2] = 0;
      break;
    case 'minor':
      parts[1]++;
      parts[2] = 0;
      break;
    case 'patch':
    default:
      parts[2]++;
      break;
  }
  
  return parts.join('.');
}

function updateVersionInFile(filePath, newVersion) {
  if (!fs.existsSync(filePath)) {
    log(`⚠️  File not found: ${filePath}`, 'yellow');
    return false;
  }
  
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const updated = updateVersionInContent(content, newVersion, filePath);
    
    if (updated !== content) {
      fs.writeFileSync(filePath, updated, 'utf8');
      log(`✅ Updated: ${filePath}`, 'green');
      return true;
    } else {
      log(`ℹ️  No changes needed: ${filePath}`, 'blue');
      return false;
    }
  } catch (error) {
    log(`❌ Error updating ${filePath}: ${error.message}`, 'red');
    return false;
  }
}

function updateVersionInContent(content, newVersion, filePath) {
  const ext = path.extname(filePath);
  
  if (ext === '.json') {
    // Handle package.json files
    try {
      const json = JSON.parse(content);
      if (json.version) {
        json.version = newVersion;
        return JSON.stringify(json, null, 2) + '\n';
      }
    } catch (error) {
      // Not valid JSON, skip
    }
  } else if (ext === '.ts' || ext === '.js') {
    // Handle TypeScript/JavaScript files
    content = content.replace(
      /VERSION\s*=\s*["']([^"']+)["']/g,
      `VERSION = "${newVersion}"`
    );
  } else if (ext === '.html') {
    // Handle HTML files (cache buster)
    const date = new Date().toISOString().split('T')[0];
    content = content.replace(
      /content="v[^"]*"/g,
      `content="v${newVersion}-${date}-auto"`
    );
  }
  
  return content;
}

function updateCacheBuster(newVersion) {
  const htmlPath = path.join(process.cwd(), 'client/index.html');
  if (fs.existsSync(htmlPath)) {
    const date = new Date().toISOString().split('T')[0];
    let content = fs.readFileSync(htmlPath, 'utf8');
    content = content.replace(
      /<meta name="cache-buster" content="[^"]*" \/>/g,
      `<meta name="cache-buster" content="v${newVersion}-${date}-auto" />`
    );
    fs.writeFileSync(htmlPath, content, 'utf8');
    log(`✅ Updated cache buster in client/index.html`, 'green');
  }
}

function updateAllVersions(newVersion) {
  const filesToUpdate = [
    'package.json',
    'client/package.json',
    'server/package.json',
    'shared/package.json',
    'shared/src/version.ts'
  ];
  
  let updateCount = 0;
  
  log(`\n🔄 Updating version to ${newVersion}...`, 'blue');
  
  // Update package.json files and version.ts
  filesToUpdate.forEach(file => {
    if (updateVersionInFile(file, newVersion)) {
      updateCount++;
    }
  });
  
  // Update cache buster
  updateCacheBuster(newVersion);
  updateCount++;
  
  return updateCount;
}

function main() {
  const args = process.argv.slice(2);
  const versionType = args[0] || 'patch'; // patch, minor, major
  
  if (!['patch', 'minor', 'major'].includes(versionType)) {
    log('❌ Invalid version type. Use: patch, minor, or major', 'red');
    process.exit(1);
  }
  
  log('\n🚀 VERSION UPDATE UTILITY', 'bold');
  log('========================', 'blue');
  
  const currentVersion = getCurrentVersion();
  if (!currentVersion) {
    log('❌ Could not determine current version', 'red');
    process.exit(1);
  }
  
  const newVersion = incrementVersion(currentVersion, versionType);
  
  log(`\n📊 Version Update Summary:`, 'blue');
  log(`   Current: ${currentVersion}`, 'yellow');
  log(`   New:     ${newVersion}`, 'green');
  log(`   Type:    ${versionType}`, 'blue');
  
  const updateCount = updateAllVersions(newVersion);
  
  log(`\n✅ Successfully updated ${updateCount} files`, 'green');
  log('🎉 Version update complete!', 'green');
  
  // Generate changelog entry
  const changelogPath = path.join(process.cwd(), 'CHANGELOG.md');
  if (fs.existsSync(changelogPath)) {
    try {
      const date = new Date().toISOString().split('T')[0];
      const changelogEntry = `\n## [${newVersion}] - ${date}\n\n### Changed\n- Version bump to ${newVersion}\n- Automated version management improvements\n\n`;
      
      let changelog = fs.readFileSync(changelogPath, 'utf8');
      // Insert after the first line (usually # Changelog)
      const lines = changelog.split('\n');
      lines.splice(2, 0, changelogEntry);
      fs.writeFileSync(changelogPath, lines.join('\n'), 'utf8');
      
      log(`📝 Updated CHANGELOG.md`, 'green');
    } catch (error) {
      log(`⚠️  Could not update changelog: ${error.message}`, 'yellow');
    }
  }
  
  log(`\n💡 Next steps:`, 'blue');
  log(`   • Review changes: git diff`, 'blue');
  log(`   • Commit: git add -A && git commit -m "BUMP: Version ${newVersion}"`, 'blue');
  log(`   • Deploy: git push origin main`, 'blue');
}

if (require.main === module) {
  main();
}

module.exports = { updateAllVersions, incrementVersion, getCurrentVersion };
