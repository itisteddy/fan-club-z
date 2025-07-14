#!/usr/bin/env node

// Test script to verify onboarding flow with query parameter
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function testOnboardingFlowWithParam() {
  console.log('🧪 Testing onboarding flow with query parameter...');
  
  try {
    // Create a custom test that navigates to /?onboarding=true
    const testCode = `
import { test, expect } from '@playwright/test';

test('should complete onboarding flow with query parameter', async ({ page }) => {
  console.log('🧪 Testing onboarding flow with onboarding=true parameter...');
  
  // Navigate to the app with onboarding parameter
  await page.goto('http://localhost:3000/?onboarding=true');
  await page.waitForLoadState('networkidle');
  
  // Ensure we start on login page
  await expect(page.locator('text=Welcome to Fan Club Z')).toBeVisible({ timeout: 10000 });
  console.log('✅ Login page loaded');
  
  // Click demo login button
  const demoButton = page.locator('button:has-text("Try Demo")');
  await expect(demoButton).toBeVisible({ timeout: 5000 });
  await demoButton.click();
  console.log('✅ Demo button clicked');
  
  // Now we should see the onboarding/compliance flow
  console.log('⏳ Waiting for onboarding flow to appear...');
  
  // Wait for either the compliance manager welcome screen OR the main app
  try {
    await Promise.race([
      page.locator('text=Before you start betting').waitFor({ timeout: 15000 }),
      page.locator('text=Welcome to Fan Club Z').waitFor({ timeout: 15000 })
    ]);
    
    console.log('🔍 Checking page content...');
    const pageContent = await page.content();
    console.log('📄 Current page title:', await page.title());
    console.log('📍 Current URL:', page.url());
    
    // Check if we can see the onboarding content
    const hasWelcomeText = await page.locator('text=Welcome to Fan Club Z').isVisible();
    const hasGetStartedButton = await page.locator('button:has-text("Get Started")').isVisible();
    const hasBeforeYouStartText = await page.locator('text=Before you start betting').isVisible();
    
    console.log('🔍 Onboarding elements check:', {
      hasWelcomeText,
      hasGetStartedButton, 
      hasBeforeYouStartText
    });
    
    if (hasGetStartedButton) {
      console.log('✅ Found Get Started button - proceeding with onboarding flow');
      
      // Click Get Started
      await page.locator('button:has-text("Get Started")').click();
      console.log('✅ Clicked Get Started');
      
      // Wait for Terms of Service
      await expect(page.locator('text=Terms of Service')).toBeVisible({ timeout: 10000 });
      console.log('✅ Terms of Service displayed');
      
      // Click I Agree on Terms
      await page.locator('button:has-text("I Agree")').click();
      console.log('✅ Agreed to Terms');
      
      // Wait for Privacy Policy
      await expect(page.locator('text=Privacy Policy')).toBeVisible({ timeout: 10000 });
      console.log('✅ Privacy Policy displayed');
      
      // Click I Agree on Privacy
      await page.locator('button:has-text("I Agree")').click();
      console.log('✅ Agreed to Privacy');
      
      // Wait for Responsible Gambling
      await expect(page.locator('text=Responsible Gambling')).toBeVisible({ timeout: 10000 });
      console.log('✅ Responsible Gambling displayed');
      
      // Click Close
      await page.locator('button:has-text("Close")').click();
      console.log('✅ Closed Responsible Gambling');
      
      // Should now be on main app
      await expect(page.locator('[data-testid="bottom-navigation"]')).toBeVisible({ timeout: 10000 });
      console.log('✅ Main app loaded with bottom navigation');
      
      console.log('🎉 Onboarding flow completed successfully!');
      
    } else {
      console.log('❌ Get Started button not found - onboarding flow not working');
      
      // Take screenshot for debugging
      await page.screenshot({ path: 'onboarding-debug.png', fullPage: true });
      console.log('📸 Debug screenshot saved: onboarding-debug.png');
      
      // Check if we're in the main app instead
      const hasBottomNav = await page.locator('[data-testid="bottom-navigation"]').isVisible();
      if (hasBottomNav) {
        console.log('⚠️ Onboarding was skipped - user went directly to main app');
      }
      
      throw new Error('Onboarding flow not showing - Get Started button not found');
    }
    
  } catch (error) {
    console.log('❌ Onboarding flow failed to appear');
    
    // Take screenshot for debugging
    await page.screenshot({ path: 'onboarding-failed.png', fullPage: true });
    console.log('📸 Debug screenshot saved: onboarding-failed.png');
    
    // Log page content for debugging
    const bodyText = await page.locator('body').textContent();
    console.log('🔍 Page content excerpt:', bodyText?.substring(0, 1000));
    
    throw error;
  }
});
`;

    // Write the test file
    const testFilePath = '/Users/efe/Library/CloudStorage/OneDrive-Personal/Fan Club Z/client/e2e-tests/onboarding-param-test.spec.ts';
    require('fs').writeFileSync(testFilePath, testCode);
    
    // Run the test
    const testCommand = \`cd client && npx playwright test e2e-tests/onboarding-param-test.spec.ts --reporter=line --timeout=120000\`;
    
    console.log('🎯 Running onboarding parameter test...');
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
      console.log('✅ Onboarding parameter test PASSED!');
    } else {
      console.log('❌ Onboarding parameter test may have failed');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.stdout) console.log('📤 Stdout:', error.stdout);
    if (error.stderr) console.log('📥 Stderr:', error.stderr);
  }
}

testOnboardingFlowWithParam();
