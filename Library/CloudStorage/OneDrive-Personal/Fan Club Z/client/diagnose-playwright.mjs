#!/usr/bin/env node

import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🔧 Playwright Configuration Diagnostic\n');

// Change to client directory
const clientDir = '/Users/efe/Library/CloudStorage/OneDrive-Personal/Fan Club Z/client';
process.chdir(clientDir);

console.log('📍 Current directory:', process.cwd());

try {
  console.log('\n1️⃣ Checking Playwright installation...');
  const lsOutput = execSync('npm ls @playwright/test', { encoding: 'utf8' });
  console.log(lsOutput);
} catch (error) {
  console.log('❌ Error checking Playwright installation:', error.message);
}

try {
  console.log('\n2️⃣ Checking test directory structure...');
  const testFiles = execSync('find e2e-tests -name "*.spec.ts" -o -name "*.test.ts"', { encoding: 'utf8' });
  console.log('Test files found:');
  console.log(testFiles);
} catch (error) {
  console.log('❌ Error listing test files:', error.message);
}

try {
  console.log('\n3️⃣ Running Playwright test --list to check configuration...');
  const listOutput = execSync('npx playwright test --list', { encoding: 'utf8' });
  console.log('Available tests:');
  console.log(listOutput);
} catch (error) {
  console.log('❌ Error listing tests:', error.message);
  console.log('STDERR:', error.stderr?.toString());
  console.log('STDOUT:', error.stdout?.toString());
}

try {
  console.log('\n4️⃣ Testing basic test execution...');
  const basicTestOutput = execSync('npx playwright test e2e-tests/basic-test.spec.ts --list', { encoding: 'utf8' });
  console.log('Basic test listing:');
  console.log(basicTestOutput);
} catch (error) {
  console.log('❌ Error with basic test:', error.message);
}

try {
  console.log('\n5️⃣ Testing clubs test specifically...');
  const clubsTestOutput = execSync('npx playwright test e2e-tests/simple-clubs.spec.ts --list', { encoding: 'utf8' });
  console.log('Simple clubs test listing:');
  console.log(clubsTestOutput);
} catch (error) {
  console.log('❌ Error with clubs test:', error.message);
}

try {
  console.log('\n6️⃣ Testing comprehensive test listing...');
  const comprehensiveOutput = execSync('npx playwright test e2e-tests/comprehensive-features.spec.ts --list', { encoding: 'utf8' });
  console.log('Comprehensive test listing:');
  console.log(comprehensiveOutput);
} catch (error) {
  console.log('❌ Error with comprehensive test:', error.message);
  console.log('This is likely where the issue is occurring!');
  console.log('STDERR:', error.stderr?.toString());
}

console.log('\n✅ Diagnostic completed!');
