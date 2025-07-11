import { test, expect } from '@playwright/test';

test('Debug: Check what page loads', async ({ page }) => {
  console.log('🔍 Starting debug test...');
  
  // Navigate to the app
  await page.goto('http://localhost:3000');
  await page.waitForLoadState('networkidle');
  
  console.log('📍 Current URL:', page.url());
  console.log('📄 Page title:', await page.title());
  
  // Take a screenshot
  await page.screenshot({ path: 'debug-page-state.png', fullPage: true });
  console.log('📸 Screenshot saved as debug-page-state.png');
  
  // Check what's actually on the page
  const pageText = await page.textContent('body');
  console.log('📝 Page contains "Welcome to Fan Club Z":', pageText?.includes('Welcome to Fan Club Z'));
  console.log('📝 Page contains "Sign In":', pageText?.includes('Sign In'));
  console.log('📝 Page contains "Try Demo":', pageText?.includes('Try Demo'));
  console.log('📝 Page contains "Discover":', pageText?.includes('Discover'));
  
  // Check for specific elements
  const welcomeExists = await page.locator('text=Welcome to Fan Club Z').count();
  const signInExists = await page.locator('button:has-text("Sign In")').count();
  const demoExists = await page.locator('button:has-text("Try Demo")').count();
  
  console.log('🔢 "Welcome to Fan Club Z" elements found:', welcomeExists);
  console.log('🔢 "Sign In" buttons found:', signInExists);
  console.log('🔢 "Try Demo" buttons found:', demoExists);
  
  // If elements are found, check visibility
  if (welcomeExists > 0) {
    const isWelcomeVisible = await page.locator('text=Welcome to Fan Club Z').isVisible();
    console.log('👁️ Welcome text visible:', isWelcomeVisible);
  }
  
  if (signInExists > 0) {
    const isSignInVisible = await page.locator('button:has-text("Sign In")').isVisible();
    console.log('👁️ Sign In button visible:', isSignInVisible);
  }
  
  console.log('✅ Debug test completed');
});