#!/usr/bin/env node

// Test script to verify onboarding flow with post-login navigation
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function testOnboardingFlowWithPostLoginNavigation() {
  console.log('🧪 Testing onboarding flow with post-login navigation...');
  
  try {
    // Create a custom test that handles the post-login navigation properly
    const testCode = `
import { test, expect } from '@playwright/test';

test('should complete onboarding flow with post-login navigation', async ({ page }) => {
  console.log('🧪 Testing onboarding flow with post-login navigation approach...');
  
  // Add browser console logging
  page.on('console', msg => console.log('📟 BROWSER:', msg.text()));
  page.on('pageerror', error => console.error('🚨 PAGE ERROR:', error.message));
  
  // Step 1: Navigate to login page normally
  await page.goto('http://localhost:3000');
  await page.waitForLoadState('networkidle');
  
  // Ensure we start on login page
  await expect(page.locator('text=Welcome to Fan Club Z')).toBeVisible({ timeout: 10000 });
  console.log('✅ Login page loaded');
  
  // Step 2: Clear any existing state and set onboarding flag
  await page.evaluate(() => {
    localStorage.removeItem('compliance_status');
    sessionStorage.setItem('force_onboarding', 'true');
    console.log('🧹 Cleared compliance status and set force_onboarding flag');
  });
  
  // Step 3: Click demo login button
  const demoButton = page.locator('button:has-text("Try Demo")');
  await expect(demoButton).toBeVisible({ timeout: 5000 });
  await demoButton.click();
  console.log('✅ Demo button clicked');
  
  // Step 4: Wait for navigation after login
  console.log('⏳ Waiting for navigation after demo login...');
  await page.waitForFunction(() => !window.location.pathname.startsWith('/auth'), { timeout: 15000 });
  console.log('✅ Navigated away from auth page');
  
  const currentUrl = page.url();
  console.log('📍 Current URL after login:', currentUrl);
  
  // Step 5: CRITICAL - Navigate to ensure onboarding parameter is respected
  console.log('🔄 Re-navigating with onboarding parameter to ensure state is correct...');
  await page.goto('http://localhost:3000/?onboarding=true');
  await page.waitForLoadState('networkidle');
  
  console.log('📍 URL after re-navigation:', page.url());
  
  // Step 6: Wait a moment for state to settle
  await page.waitForTimeout(2000);
  
  // Step 7: Check what's actually rendered
  console.log('🔍 Checking page content after re-navigation...');
  
  const pageContent = await page.content();
  const hasWelcomeText = pageContent.includes('Welcome to Fan Club Z');
  const hasGetStartedButton = pageContent.includes('Get Started');
  const hasBeforeYouStartText = pageContent.includes('Before you start betting');
  const hasBottomNavigation = pageContent.includes('data-testid="bottom-navigation"');
  
  console.log('🔍 Content analysis:', {
    hasWelcomeText,
    hasGetStartedButton,
    hasBeforeYouStartText,
    hasBottomNavigation,
    currentStep: 'post-renavigation'
  });
  
  // Step 8: Take screenshot for debugging
  await page.screenshot({ path: 'onboarding-post-login-debug.png', fullPage: true });
  console.log('📸 Debug screenshot saved: onboarding-post-login-debug.png');
  
  // Step 9: Check if ComplianceManager is rendered
  const complianceManagerVisible = await page.locator('text=Welcome to Fan Club Z').isVisible();
  const getStartedButtonVisible = await page.locator('button:has-text("Get Started")').isVisible();
  
  console.log('🔍 Element visibility check:', {
    complianceManagerVisible,
    getStartedButtonVisible
  });
  
  if (getStartedButtonVisible) {
    console.log('✅ Found Get Started button - proceeding with onboarding flow');
    
    // Step 10: Complete the onboarding flow
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
    console.log('❌ Get Started button not found after re-navigation');
    
    // Check what's actually on the page
    const bodyText = await page.locator('body').textContent();
    console.log('🔍 Page body text (first 1000 chars):', bodyText?.substring(0, 1000));
    
    // Check if we're in main app instead
    const hasBottomNav = await page.locator('[data-testid="bottom-navigation"]').isVisible();
    if (hasBottomNav) {
      console.log('⚠️ Onboarding was skipped - user is in main app');
      
      // Let's try to check the app state
      const appState = await page.evaluate(() => {
        return {
          pathname: window.location.pathname,
          search: window.location.search,
          sessionStorage_force_onboarding: sessionStorage.getItem('force_onboarding'),
          localStorage_compliance: localStorage.getItem('compliance_status'),
          localStorage_auth: localStorage.getItem('fan-club-z-auth')
        };
      });
      console.log('🔍 App state:', appState);
    }
    
    throw new Error('Onboarding flow not showing after re-navigation');
  }
});
`;

    // Write the test file
    const testFilePath = '/Users/efe/Library/CloudStorage/OneDrive-Personal/Fan Club Z/client/e2e-tests/onboarding-post-login-test.spec.ts';
    require('fs').writeFileSync(testFilePath, testCode);
    
    // Run the test
    const testCommand = \`cd client && npx playwright test e2e-tests/onboarding-post-login-test.spec.ts --reporter=line --timeout=180000\`;
    
    console.log('🎯 Running onboarding post-login test...');
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
      console.log('✅ Onboarding post-login test PASSED!');
    } else {
      console.log('❌ Onboarding post-login test may have failed');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.stdout) console.log('📤 Stdout:', error.stdout);
    if (error.stderr) console.log('📥 Stderr:', error.stderr);
  }
}

testOnboardingFlowWithPostLoginNavigation();
