#!/usr/bin/env node

/**
 * Automated Version Synchronization Script
 * Ensures all package.json files and cache busters are in sync
 */

const fs = require('fs');
const path = require('path');

// Files to update
const FILES_TO_UPDATE = [
  'package.json',
  'client/package.json',
  'server/package.json',
  'shared/package.json',
  'client/index.html'
];

// Get command line arguments
const args = process.argv.slice(2);
const versionType = args[0] || 'patch'; // patch, minor, major

console.log(`🔄 Starting version synchronization...`);
console.log(`📦 Version type: ${versionType}`);

// Read current version from root package.json
function getCurrentVersion() {
  const rootPackage = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  return rootPackage.version;
}

// Parse version string
function parseVersion(version) {
  const [major, minor, patch] = version.split('.').map(Number);
  return { major, minor, patch };
}

// Generate new version
function generateNewVersion(currentVersion, type) {
  const { major, minor, patch } = parseVersion(currentVersion);
  
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

// Update package.json file
function updatePackageJson(filePath, newVersion) {
  console.log(`📝 Updating ${filePath} to version ${newVersion}`);
  
  const packagePath = path.resolve(filePath);
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  
  packageJson.version = newVersion;
  
  // Write back with proper formatting
  fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n');
}

// Update cache buster in index.html
function updateCacheBuster(filePath, newVersion) {
  console.log(`📝 Updating cache buster in ${filePath}`);
  
  const htmlPath = path.resolve(filePath);
  let htmlContent = fs.readFileSync(htmlPath, 'utf8');
  
  const today = new Date().toISOString().split('T')[0];
  const newCacheBuster = `v${newVersion}-${today}-auto`;
  
  // Replace cache buster meta tag
  htmlContent = htmlContent.replace(
    /<meta name="cache-buster" content="[^"]*" \/>/,
    `<meta name="cache-buster" content="${newCacheBuster}" />`
  );
  
  fs.writeFileSync(htmlPath, htmlContent);
}

// Main execution
function main() {
  try {
    const currentVersion = getCurrentVersion();
    console.log(`📋 Current version: ${currentVersion}`);
    
    const newVersion = generateNewVersion(currentVersion, versionType);
    console.log(`🆕 New version: ${newVersion}`);
    
    // Update all package.json files
    FILES_TO_UPDATE.forEach(file => {
      if (file.endsWith('package.json')) {
        updatePackageJson(file, newVersion);
      } else if (file.endsWith('index.html')) {
        updateCacheBuster(file, newVersion);
      }
    });
    
    console.log(`✅ Version synchronization complete!`);
    console.log(`📊 Updated ${FILES_TO_UPDATE.length} files to version ${newVersion}`);
    console.log(`🚀 Ready for deployment`);
    
  } catch (error) {
    console.error(`❌ Error during version synchronization:`, error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { getCurrentVersion, generateNewVersion, updatePackageJson, updateCacheBuster };

