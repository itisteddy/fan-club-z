#!/usr/bin/env node

// Simple test to verify onboarding flow
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function testOnboardingFlow() {
  console.log('🧪 Testing onboarding flow...');
  
  try {
    // First, let's start the development server
    console.log('🚀 Starting development server...');
    
    // Run the specific test for onboarding
    const testCommand = 'cd client && npx playwright test e2e-tests/comprehensive-features.spec.ts --grep "should complete onboarding flow" --reporter=line';
    
    console.log('🎯 Running onboarding test...');
    console.log('Command:', testCommand);
    
    const { stdout, stderr } = await execAsync(testCommand, { 
      timeout: 60000,
      cwd: '/Users/efe/Library/CloudStorage/OneDrive-Personal/Fan Club Z'
    });
    
    console.log('📤 Test output:', stdout);
    if (stderr) {
      console.log('📥 Test errors:', stderr);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.stdout) console.log('📤 Stdout:', error.stdout);
    if (error.stderr) console.log('📥 Stderr:', error.stderr);
  }
}

testOnboardingFlow();
