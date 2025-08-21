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

function findHardcodedVersions(dir, excludeDirs = []) {
  const hardcodedVersions = [];
  
  function scanDirectory(currentDir) {
    try {
      const items = fs.readdirSync(currentDir);
      
      for (const item of items) {
        const fullPath = path.join(currentDir, item);
        const relativePath = path.relative(process.cwd(), fullPath);
        
        // Skip excluded directories
        if (excludeDirs.some(exclude => relativePath.includes(exclude))) {
          continue;
        }
        
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          scanDirectory(fullPath);
        } else if (stat.isFile() && shouldScanFile(fullPath)) {
          scanFile(fullPath, relativePath);
        }
      }
    } catch (error) {
      // Skip directories we can't read
    }
  }
  
  function shouldScanFile(filePath) {
    const ext = path.extname(filePath);
    const allowedExtensions = ['.ts', '.tsx', '.js', '.jsx', '.json', '.html', '.md'];
    return allowedExtensions.includes(ext);
  }
  
  function scanFile(filePath, relativePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      
      // Pattern to match version numbers like 2.0.55, 2.0.56, etc.
      const versionPattern = /(?:version['"`]?\s*[:=]\s*['"`]?|['"`])(\d+\.\d+\.\d+)['"`]?/gi;
      const strictVersionPattern = /2\.0\.\d+/g;
      
      lines.forEach((line, index) => {
        let match;
        
        // Check for strict version pattern (2.0.x)
        while ((match = strictVersionPattern.exec(line)) !== null) {
          // Skip if it's in a comment or obvious dynamic context
          if (line.trim().startsWith('//') || 
              line.trim().startsWith('*') || 
              line.trim().startsWith('#') ||
              line.includes('VERSION') ||
              line.includes('process.env') ||
              line.includes('import') && line.includes('version')) {
            continue;
          }
          
          hardcodedVersions.push({
            file: relativePath,
            line: index + 1,
            content: line.trim(),
            version: match[0],
            context: line
          });
        }
      });
    } catch (error) {
      // Skip files we can't read
    }
  }
  
  scanDirectory(dir);
  return hardcodedVersions;
}

function getCurrentVersion() {
  try {
    // Read from shared version file
    const versionPath = path.join(process.cwd(), 'shared/src/version.ts');
    if (fs.existsSync(versionPath)) {
      const content = fs.readFileSync(versionPath, 'utf8');
      const match = content.match(/VERSION\s*=\s*["']([^"']+)["']/);
      if (match) {
        return match[1];
      }
    }
    
    // Fallback to package.json
    const packagePath = path.join(process.cwd(), 'package.json');
    if (fs.existsSync(packagePath)) {
      const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
      return packageJson.version;
    }
    
    return 'unknown';
  } catch (error) {
    return 'unknown';
  }
}

function checkPackageJsonVersions() {
  const packageFiles = [
    'package.json',
    'client/package.json',
    'server/package.json', 
    'shared/package.json'
  ];
  
  const versions = {};
  const issues = [];
  
  packageFiles.forEach(file => {
    const fullPath = path.join(process.cwd(), file);
    if (fs.existsSync(fullPath)) {
      try {
        const content = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
        versions[file] = content.version;
      } catch (error) {
        issues.push(`Error reading ${file}: ${error.message}`);
      }
    }
  });
  
  // Check if all versions match
  const uniqueVersions = [...new Set(Object.values(versions))];
  if (uniqueVersions.length > 1) {
    issues.push('Package.json files have different versions:');
    Object.entries(versions).forEach(([file, version]) => {
      issues.push(`  ${file}: ${version}`);
    });
  }
  
  return { versions, issues };
}

function generateVersionReport() {
  log('\n📋 VERSION AUDIT REPORT', 'bold');
  log('=====================================', 'blue');
  
  const currentVersion = getCurrentVersion();
  log(`\n✅ Current project version: ${currentVersion}`, 'green');
  
  // Check package.json versions
  log('\n📦 Package.json Version Check:', 'blue');
  const { versions, issues } = checkPackageJsonVersions();
  
  if (issues.length === 0) {
    log('✅ All package.json files have consistent versions', 'green');
    Object.entries(versions).forEach(([file, version]) => {
      log(`   ${file}: ${version}`, 'green');
    });
  } else {
    log('❌ Version inconsistencies found:', 'red');
    issues.forEach(issue => log(`   ${issue}`, 'red'));
  }
  
  // Scan for hardcoded versions
  log('\n🔍 Scanning for hardcoded versions...', 'blue');
  
  const excludeDirs = [
    'node_modules',
    '.git',
    'dist',
    'build',
    '.next',
    'coverage',
    '.nyc_output',
    'scripts' // Exclude this scripts directory
  ];
  
  const hardcodedVersions = findHardcodedVersions(process.cwd(), excludeDirs);
  
  if (hardcodedVersions.length === 0) {
    log('✅ No hardcoded versions found!', 'green');
  } else {
    log(`❌ Found ${hardcodedVersions.length} hardcoded version(s):`, 'red');
    
    // Group by file for better readability
    const byFile = {};
    hardcodedVersions.forEach(item => {
      if (!byFile[item.file]) byFile[item.file] = [];
      byFile[item.file].push(item);
    });
    
    Object.entries(byFile).forEach(([file, items]) => {
      log(`\n   📄 ${file}:`, 'yellow');
      items.forEach(item => {
        log(`      Line ${item.line}: ${item.content}`, 'red');
      });
    });
    
    log('\n💡 Recommendations:', 'yellow');
    log('   • Replace hardcoded versions with imports from shared/src/version.ts', 'yellow');
    log('   • Use process.env.npm_package_version for package.json version', 'yellow');
    log('   • Consider using a centralized version management system', 'yellow');
  }
  
  log('\n📊 Summary:', 'blue');
  log(`   Current version: ${currentVersion}`, 'blue');
  log(`   Package files checked: ${Object.keys(versions).length}`, 'blue');
  log(`   Version consistency: ${issues.length === 0 ? '✅ Good' : '❌ Issues found'}`, issues.length === 0 ? 'green' : 'red');
  log(`   Hardcoded versions: ${hardcodedVersions.length === 0 ? '✅ None' : `❌ ${hardcodedVersions.length} found`}`, hardcodedVersions.length === 0 ? 'green' : 'red');
  
  return {
    currentVersion,
    packageVersions: versions,
    versionIssues: issues,
    hardcodedVersions,
    isClean: issues.length === 0 && hardcodedVersions.length === 0
  };
}

// Main execution
if (require.main === module) {
  const report = generateVersionReport();
  
  if (report.isClean) {
    log('\n🎉 Version audit passed! No issues found.', 'green');
    process.exit(0);
  } else {
    log('\n⚠️  Version audit found issues that should be addressed.', 'yellow');
    process.exit(1);
  }
}

module.exports = { generateVersionReport, findHardcodedVersions, getCurrentVersion };
