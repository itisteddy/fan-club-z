#!/usr/bin/env node

// Test the onboarding flow implementation without demo login
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function testOnboardingFlowClean() {
  console.log('🧪 Testing onboarding flow (no demo login)...');
  
  try {
    // Test the specific onboarding flow test
    const testCommand = 'cd client && npx playwright test e2e-tests/comprehensive-features.spec.ts --grep "should complete onboarding flow" --reporter=line --timeout=120000 --headed';
    
    console.log('🎯 Running clean onboarding test...');
    console.log('Command:', testCommand);
    console.log('ℹ️  This test will attempt user registration and onboarding flow');
    console.log('ℹ️  Make sure the backend server is running for full test');
    
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
      console.log('🎉 The onboarding flow works with real user registration!');
    } else if (stdout.includes('skipped')) {
      console.log('⏭️  Test was skipped (likely due to backend not running)');
      console.log('ℹ️  This is expected if the backend server is not available');
    } else {
      console.log('❌ Onboarding flow test may have failed');
      console.log('🔍 Check the browser window and test output for details');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.stdout) console.log('📤 Stdout:', error.stdout);
    if (error.stderr) console.log('📥 Stderr:', error.stderr);
    
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Ensure the backend server is running on the correct port');
    console.log('2. Check that the registration API endpoint is working');
    console.log('3. Verify the onboarding route is properly configured');
    console.log('4. Check browser console for any JavaScript errors');
  }
}

testOnboardingFlowClean();
