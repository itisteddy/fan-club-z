#!/usr/bin/env node

/**
 * Version Verification Script
 * Ensures all package.json files and cache busters are in sync
 */

const fs = require('fs');
const path = require('path');

// Files to check
const FILES_TO_CHECK = [
  'package.json',
  'client/package.json',
  'server/package.json',
  'shared/package.json',
  'client/index.html'
];

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Read version from package.json
function getPackageVersion(filePath) {
  try {
    const packagePath = path.resolve(filePath);
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    return packageJson.version;
  } catch (error) {
    return null;
  }
}

// Read cache buster from index.html
function getCacheBuster(filePath) {
  try {
    const htmlPath = path.resolve(filePath);
    const htmlContent = fs.readFileSync(htmlPath, 'utf8');
    const match = htmlContent.match(/<meta name="cache-buster" content="([^"]*)" \/>/);
    return match ? match[1] : null;
  } catch (error) {
    return null;
  }
}

// Extract version from cache buster
function extractVersionFromCacheBuster(cacheBuster) {
  if (!cacheBuster) return null;
  const match = cacheBuster.match(/^v(\d+\.\d+\.\d+)/);
  return match ? match[1] : null;
}

// Main verification function
function verifyVersions() {
  log('🔍 Verifying version synchronization...', 'blue');
  log('', 'reset');
  
  const versions = {};
  const issues = [];
  
  // Check package.json files
  FILES_TO_CHECK.forEach(file => {
    if (file.endsWith('package.json')) {
      const version = getPackageVersion(file);
      if (version) {
        versions[file] = version;
        log(`✅ ${file}: ${version}`, 'green');
      } else {
        issues.push(`❌ Could not read version from ${file}`);
        log(`❌ ${file}: Could not read version`, 'red');
      }
    } else if (file.endsWith('index.html')) {
      const cacheBuster = getCacheBuster(file);
      const version = extractVersionFromCacheBuster(cacheBuster);
      if (version) {
        versions[file] = version;
        log(`✅ ${file}: ${version} (cache-buster: ${cacheBuster})`, 'green');
      } else {
        issues.push(`❌ Could not read cache buster from ${file}`);
        log(`❌ ${file}: Could not read cache buster`, 'red');
      }
    }
  });
  
  log('', 'reset');
  
  // Check if all versions match
  const uniqueVersions = [...new Set(Object.values(versions))];
  
  if (uniqueVersions.length === 1) {
    log(`🎉 All versions are synchronized!`, 'green');
    log(`📦 Current version: ${uniqueVersions[0]}`, 'bold');
  } else {
    log(`⚠️  Version mismatch detected!`, 'yellow');
    log('', 'reset');
    
    Object.entries(versions).forEach(([file, version]) => {
      log(`${file}: ${version}`, 'yellow');
    });
    
    issues.push(`Version mismatch: Found ${uniqueVersions.length} different versions`);
  }
  
  // Report issues
  if (issues.length > 0) {
    log('', 'reset');
    log('🚨 Issues found:', 'red');
    issues.forEach(issue => {
      log(`  ${issue}`, 'red');
    });
    
    log('', 'reset');
    log('💡 To fix version issues, run:', 'blue');
    log('   npm run version:bump', 'bold');
    
    process.exit(1);
  } else {
    log('', 'reset');
    log('✅ Version verification passed!', 'green');
    log('🚀 All components are ready for deployment', 'blue');
  }
}

// Run if called directly
if (require.main === module) {
  verifyVersions();
}

module.exports = { verifyVersions, getPackageVersion, getCacheBuster };
