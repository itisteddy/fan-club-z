#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Function to increment version
function incrementVersion(version, type = 'patch') {
  const [major, minor, patch] = version.split('.').map(Number);
  
  switch (type) {
    case 'major':
      return `${major + 1}.0.0`;
    case 'minor':
      return `${major}.${minor + 1}.0`;
    case 'patch':
    default:
      return `${major}.${minor}.${patch + 1}`;
  }
}

// Function to update package.json
function updatePackageJson(filePath, newVersion) {
  try {
    const packageJson = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    packageJson.version = newVersion;
    fs.writeFileSync(filePath, JSON.stringify(packageJson, null, 2) + '\n');
    console.log(`✅ Updated ${filePath} to version ${newVersion}`);
  } catch (error) {
    console.error(`❌ Error updating ${filePath}:`, error.message);
  }
}

// Function to update cache buster in index.html
function updateCacheBuster(newVersion) {
  const htmlPath = path.join(__dirname, '../client/index.html');
  try {
    let html = fs.readFileSync(htmlPath, 'utf8');
    const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const newCacheBuster = `v${newVersion}-${today}-auto`;
    
    html = html.replace(
      /<meta name="cache-buster" content="[^"]*" \/>/,
      `<meta name="cache-buster" content="${newCacheBuster}" />`
    );
    
    fs.writeFileSync(htmlPath, html);
    console.log(`✅ Updated cache buster to ${newCacheBuster}`);
  } catch (error) {
    console.error(`❌ Error updating cache buster:`, error.message);
  }
}

// Main function
function main() {
  const type = process.argv[2] || 'patch'; // patch, minor, or major
  const currentVersion = require('../package.json').version;
  const newVersion = incrementVersion(currentVersion, type);
  
  console.log(`🔄 Bumping version from ${currentVersion} to ${newVersion} (${type})`);
  
  // Update all package.json files
  const packageFiles = [
    '../package.json',
    '../client/package.json',
    '../server/package.json',
    '../shared/package.json'
  ];
  
  packageFiles.forEach(file => {
    const filePath = path.join(__dirname, file);
    if (fs.existsSync(filePath)) {
      updatePackageJson(filePath, newVersion);
    }
  });
  
  // Update cache buster
  updateCacheBuster(newVersion);
  
  console.log(`\n🎉 Version bump complete! New version: ${newVersion}`);
  console.log(`📝 Don't forget to commit these changes:`);
  console.log(`   git add . && git commit -m "BUMP: Version ${newVersion}" && git push origin main`);
}

main();
