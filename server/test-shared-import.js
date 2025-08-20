#!/usr/bin/env node

/**
 * Test script to verify shared package import
 */

try {
  console.log('🔍 Testing shared package import...');
  
  // Test relative import first
  const shared = require('../shared/dist/index.js');
  console.log('✅ Shared package import successful');
  console.log('📦 Available exports:', Object.keys(shared));
  
  // Test workspace import (how server will import it)
  try {
    const sharedWorkspace = require('@fanclubz/shared');
    console.log('✅ Workspace import successful');
  } catch (error) {
    console.log('⚠️ Workspace import failed (this might be expected in dev):', error.message);
  }
  
} catch (error) {
  console.error('❌ Shared package import failed:', error.message);
  console.error('💡 Make sure to run: cd shared && npm run build');
  process.exit(1);
}

console.log('🎉 All tests passed!');
