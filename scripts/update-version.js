#!/usr/bin/env node
/**
 * Version Update Script
 * Updates all version references across the project
 * Follows the user's preference for centralized version management
 */

const fs = require('fs');
const path = require('path');

// Read version from shared source of truth
const sharedVersionPath = path.join(__dirname, '../shared/src/version.ts');
const versionContent = fs.readFileSync(sharedVersionPath, 'utf8');
const versionMatch = versionContent.match(/export const VERSION = "([^"]+)"/);

if (!versionMatch) {
  console.error('❌ Could not extract version from shared/src/version.ts');
  process.exit(1);
}

const VERSION = versionMatch[1];
const BUILD_DATE = new Date().toISOString().split('T')[0];
const CACHE_BUSTER = `v${VERSION}-${BUILD_DATE}-auto`;

console.log(`🔄 Updating all version references to: ${VERSION}`);

// Update package.json files
const packagePaths = [
  '../package.json',
  '../client/package.json',
  '../server/package.json',
  '../shared/package.json'
];

packagePaths.forEach(packagePath => {
  const fullPath = path.join(__dirname, packagePath);
  if (fs.existsSync(fullPath)) {
    const packageContent = fs.readFileSync(fullPath, 'utf8');
    const updatedContent = packageContent.replace(
      /"version":\s*"[^"]+"/,
      `"version": "${VERSION}"`
    );
    fs.writeFileSync(fullPath, updatedContent);
    console.log(`✅ Updated: ${packagePath}`);
  }
});

// Update client/index.html cache-buster
const indexPath = path.join(__dirname, '../client/index.html');
if (fs.existsSync(indexPath)) {
  const indexContent = fs.readFileSync(indexPath, 'utf8');
  const updatedContent = indexContent.replace(
    /<meta name="cache-buster" content="[^"]*" \/>/,
    `<meta name="cache-buster" content="${CACHE_BUSTER}" />`
  );
  fs.writeFileSync(indexPath, updatedContent);
  console.log(`✅ Updated: client/index.html cache-buster to ${CACHE_BUSTER}`);
}

// Update VERSION_MANAGEMENT.md
const docsPath = path.join(__dirname, '../docs/VERSION_MANAGEMENT.md');
if (fs.existsSync(docsPath)) {
  const docsContent = fs.readFileSync(docsPath, 'utf8');
  const updatedContent = docsContent.replace(
    /\*\*Version:\*\* `[^`]+`/,
    `**Version:** \`${VERSION}\``
  ).replace(
    /- `[^`]+` \(root\) - `[^`]+`/,
    `- \`package.json\` (root) - \`${VERSION}\``
  ).replace(
    /- `client\/package\.json` - `[^`]+`/,
    `- \`client/package.json\` - \`${VERSION}\``
  ).replace(
    /- `server\/package\.json` - `[^`]+`/,
    `- \`server/package.json\` - \`${VERSION}\``
  ).replace(
    /- `shared\/package\.json` - `[^`]+`/,
    `- \`shared/package.json\` - \`${VERSION}\``
  ).replace(
    /- `client\/index\.html` - `[^`]+`/,
    `- \`client/index.html\` - \`${CACHE_BUSTER}\``
  );
  fs.writeFileSync(docsPath, updatedContent);
  console.log(`✅ Updated: docs/VERSION_MANAGEMENT.md`);
}

console.log(`🚀 All version references updated to: ${VERSION}`);
console.log(`📦 Cache-buster: ${CACHE_BUSTER}`);
console.log(`✅ Ready for deployment!`);