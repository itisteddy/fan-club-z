import { test, expect } from '@playwright/test';

test.describe('Debug Authentication', () => {
  test('Debug login page elements', async ({ page }) => {
    console.log('🔍 Starting debug test...');
    
    // Navigate to the app
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    
    console.log('🔍 Page loaded, taking screenshot...');
    await page.screenshot({ path: 'debug-login-elements.png', fullPage: true });
    
    // Check if we're on the login page
    console.log('🔍 Looking for Welcome text...');
    const welcomeText = page.locator('text=Welcome to Fan Club Z');
    const isWelcomeVisible = await welcomeText.isVisible();
    console.log('🔍 Welcome text visible:', isWelcomeVisible);
    
    if (isWelcomeVisible) {
      console.log('✅ Welcome text found');
    } else {
      console.log('❌ Welcome text not found');
      const pageContent = await page.content();
      console.log('Page content length:', pageContent.length);
      console.log('Page title:', await page.title());
      console.log('Current URL:', page.url());
    }
    
    // Check for Sign In button
    console.log('🔍 Looking for Sign In button...');
    const signInButton = page.locator('button:has-text("Sign In")');
    const isSignInVisible = await signInButton.isVisible();
    console.log('🔍 Sign In button visible:', isSignInVisible);
    
    if (!isSignInVisible) {
      console.log('🔍 Checking all buttons on page...');
      const allButtons = await page.locator('button').all();
      console.log('Total buttons found:', allButtons.length);
      
      for (let i = 0; i < allButtons.length; i++) {
        const buttonText = await allButtons[i].textContent();
        console.log(`Button ${i + 1}: "${buttonText}"`);
      }
    }
    
    // Try demo login
    console.log('🔍 Looking for Try Demo button...');
    const demoButton = page.locator('button:has-text("Try Demo")');
    const isDemoVisible = await demoButton.isVisible();
    console.log('🔍 Try Demo button visible:', isDemoVisible);
    
    if (isDemoVisible) {
      console.log('🔍 Clicking Try Demo button...');
      await demoButton.click();
      await page.waitForTimeout(2000);
      
      console.log('🔍 After demo login, taking screenshot...');
      await page.screenshot({ path: 'debug-after-demo-login.png', fullPage: true });
      
      // Check for bottom navigation
      const bottomNav = page.locator('[data-testid="bottom-navigation"]');
      const isNavVisible = await bottomNav.isVisible();
      console.log('🔍 Bottom navigation visible:', isNavVisible);
      
      if (!isNavVisible) {
        console.log('🔍 Checking for compliance manager...');
        const complianceText = page.locator('text=Before you start betting');
        const isComplianceVisible = await complianceText.isVisible();
        console.log('🔍 Compliance manager visible:', isComplianceVisible);
        
        if (isComplianceVisible) {
          console.log('🔍 Compliance manager is blocking, looking for Continue button...');
          const continueButton = page.locator('button:has-text("Continue to Privacy Policy")');
          const isContinueVisible = await continueButton.isVisible();
          console.log('🔍 Continue button visible:', isContinueVisible);
        }
      }
      
      console.log('Current URL after demo login:', page.url());
    }
    
    console.log('🔍 Debug test completed');
  });
});
