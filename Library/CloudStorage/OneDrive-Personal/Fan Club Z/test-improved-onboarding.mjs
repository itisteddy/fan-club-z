#!/usr/bin/env node

// Execute the improved onboarding test
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function runImprovedOnboardingTest() {
  console.log('🧪 Running improved onboarding test with post-login navigation...');
  
  try {
    // Test the specific onboarding flow test with enhanced debugging
    const testCommand = 'cd client && npx playwright test e2e-tests/comprehensive-features.spec.ts --grep "should complete onboarding flow" --reporter=line --timeout=180000';
    
    console.log('🎯 Running onboarding test with enhanced debugging...');
    console.log('Command:', testCommand);
    
    const { stdout, stderr } = await execAsync(testCommand, { 
      timeout: 240000,
      cwd: '/Users/efe/Library/CloudStorage/OneDrive-Personal/Fan Club Z'
    });
    
    console.log('📤 Test output:', stdout);
    if (stderr) {
      console.log('📥 Test errors:', stderr);
    }
    
    // Check if the test passed
    if (stdout.includes('passed') || stdout.includes('✓')) {
      console.log('✅ Onboarding flow test PASSED!');
      console.log('🎉 The onboarding flow issue has been resolved!');
    } else {
      console.log('❌ Onboarding flow test still failing');
      console.log('🔍 Check the debug output above and the screenshots for more details');
    }
    
  } catch (error) {
    console.error('❌ Test execution failed:', error.message);
    if (error.stdout) console.log('📤 Stdout:', error.stdout);
    if (error.stderr) console.log('📥 Stderr:', error.stderr);
    
    console.log('\n🔧 Troubleshooting suggestions:');
    console.log('1. Check if the development server is running');
    console.log('2. Look at the debug screenshots generated during the test');
    console.log('3. Review the browser console logs for any JavaScript errors');
    console.log('4. Verify that the query parameter logic is working correctly');
  }
}

runImprovedOnboardingTest();
