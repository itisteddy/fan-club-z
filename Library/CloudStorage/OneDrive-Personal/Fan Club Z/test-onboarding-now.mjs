#!/usr/bin/env node

// Test the specific onboarding flow
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function testOnboardingFlow() {
  console.log('🧪 Testing onboarding flow...');
  
  try {
    // Test the specific onboarding flow test
    const testCommand = 'cd client && npx playwright test e2e-tests/comprehensive-features.spec.ts --grep "should complete onboarding flow" --reporter=line --timeout=120000 --headed';
    
    console.log('🎯 Running onboarding test...');
    console.log('Command:', testCommand);
    
    const { stdout, stderr } = await execAsync(testCommand, { 
      timeout: 180000,
      cwd: '/Users/efe/Library/CloudStorage/OneDrive-Personal/Fan Club Z'
    });
    
    console.log('📤 Test output:', stdout);
    if (stderr) {
      console.log('📥 Test errors:', stderr);
    }
    
    // Check if the test passed
    if (stdout.includes('passed') || stdout.includes('✓')) {
      console.log('✅ Onboarding flow test PASSED!');
    } else {
      console.log('❌ Onboarding flow test may have failed');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.stdout) console.log('📤 Stdout:', error.stdout);
    if (error.stderr) console.log('📥 Stderr:', error.stderr);
  }
}

testOnboardingFlow();
