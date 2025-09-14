#!/usr/bin/env node

/**
 * Get version from package.json
 * Usage: node scripts/get-version.js [workspace]
 * 
 * Examples:
 * - node scripts/get-version.js (root version)
 * - node scripts/get-version.js client
 * - node scripts/get-version.js server
 * - node scripts/get-version.js shared
 */

const fs = require('fs');
const path = require('path');

function getVersion(workspace = null) {
  let packagePath;
  
  if (workspace) {
    packagePath = path.join(__dirname, '..', workspace, 'package.json');
  } else {
    packagePath = path.join(__dirname, '..', 'package.json');
  }
  
  try {
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    return packageJson.version;
  } catch (error) {
    console.error(`Error reading version from ${packagePath}:`, error.message);
    process.exit(1);
  }
}

const workspace = process.argv[2];
const version = getVersion(workspace);
console.log(version);
