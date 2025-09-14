#!/usr/bin/env node

/**
 * Generate version.json file for client
 * This script reads the version from package.json and creates a version.json file
 */

const fs = require('fs');
const path = require('path');

function generateVersionJson() {
  try {
    // Read version from client package.json
    const packagePath = path.join(__dirname, '..', 'client', 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    
    const versionData = {
      version: packageJson.version,
      buildTime: new Date().toISOString(),
      features: [
        "content-first-auth",
        "auth-sheet-gating", 
        "resume-after-auth",
        "version-detection",
        "live-stats-refresh",
        "types-logging-hardening",
        "release-hygiene"
      ]
    };
    
    // Write to client/public/version.json
    const outputPath = path.join(__dirname, '..', 'client', 'public', 'version.json');
    fs.writeFileSync(outputPath, JSON.stringify(versionData, null, 2));
    
    console.log(`✅ Generated version.json with version ${packageJson.version}`);
  } catch (error) {
    console.error('❌ Error generating version.json:', error.message);
    process.exit(1);
  }
}

generateVersionJson();
