#!/usr/bin/env node

/**
 * Quick script to check for potential console/runtime issues
 * by searching for common error patterns in the codebase
 */

const fs = require('fs');
const path = require('path');

function searchInFile(filePath, patterns) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const issues = [];
    
    patterns.forEach(({ pattern, description }) => {
      if (content.includes(pattern)) {
        const lineNumber = content.split('\n').findIndex(line => line.includes(pattern)) + 1;
        issues.push({ pattern, description, lineNumber });
      }
    });
    
    return issues;
  } catch (error) {
    return [];
  }
}

function searchDirectory(dir, patterns) {
  const issues = [];
  
  function traverse(currentDir) {
    const items = fs.readdirSync(currentDir);
    
    for (const item of items) {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
        traverse(fullPath);
      } else if (stat.isFile() && (item.endsWith('.ts') || item.endsWith('.tsx'))) {
        const fileIssues = searchInFile(fullPath, patterns);
        if (fileIssues.length > 0) {
          issues.push({ file: fullPath, issues: fileIssues });
        }
      }
    }
  }
  
  traverse(dir);
  return issues;
}

const patterns = [
  { pattern: 'useNavigate', description: 'useNavigate import (wouter does not export this)' },
  { pattern: 'log.debug is not a function', description: 'Logger function issue' },
  { pattern: 'logger.debug', description: 'Logger usage that might need fixing' },
  { pattern: 'import logger from', description: 'Logger default import' },
  { pattern: '₦', description: 'Hard-coded Naira symbol' },
  { pattern: 'formatTimeAgo already declared', description: 'Duplicate formatTimeAgo export' },
  { pattern: '@/components/navigation/AppHeader', description: 'AppHeader import with @/ alias' },
  { pattern: 'MobileHeader', description: 'Old MobileHeader usage' },
  { pattern: 'onBack=', description: 'Old AppHeader prop name' },
  { pattern: 'right=', description: 'Old AppHeader prop name (should be rightSlot)' }
];

console.log('🔍 Searching for potential console/runtime issues...\n');

const srcDir = path.join(__dirname, 'src');
const results = searchDirectory(srcDir, patterns);

if (results.length === 0) {
  console.log('✅ No obvious issues found!');
} else {
  console.log(`❌ Found ${results.length} files with potential issues:\n`);
  
  results.forEach(({ file, issues }) => {
    console.log(`📁 ${path.relative(srcDir, file)}`);
    issues.forEach(({ pattern, description, lineNumber }) => {
      console.log(`   Line ${lineNumber}: ${description}`);
      console.log(`   Pattern: "${pattern}"`);
    });
    console.log('');
  });
}
