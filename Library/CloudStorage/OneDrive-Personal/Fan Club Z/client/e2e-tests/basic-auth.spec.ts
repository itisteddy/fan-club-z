import { test, expect } from '@playwright/test';

test('should display login page for unauthenticated users', async ({ page }) => {
  console.log('🧪 Starting authentication test...');
  
  // Navigate to the app
  await page.goto('http://localhost:3000');
  await page.waitForLoadState('networkidle');
  
  console.log('📍 Current URL:', page.url());
  
  // Check if we're on the login page
  console.log('🔍 Looking for welcome text...');
  const welcomeLocator = page.locator('text=Welcome to Fan Club Z');
  await expect(welcomeLocator).toBeVisible();
  console.log('✅ Welcome text found');
  
  console.log('🔍 Looking for Sign In button...');
  const signInLocator = page.locator('button:has-text("Sign In")');
  await expect(signInLocator).toBeVisible();
  console.log('✅ Sign In button found');
  
  console.log('🎉 Test completed successfully!');
});
