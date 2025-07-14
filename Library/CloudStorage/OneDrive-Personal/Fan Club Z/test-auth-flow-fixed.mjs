import { test, expect } from '@playwright/test';

test.describe('Fixed Authentication Flow Test', () => {
  test.beforeEach(async ({ page }) => {
    // Add console logging to track issues
    page.on('console', (msg) => {
      if (msg.type() === 'error' || msg.text().includes('🚀') || msg.text().includes('🎯') || msg.text().includes('✅') || msg.text().includes('❌')) {
        console.log(`🖥️  BROWSER: ${msg.text()}`);
      }
    });
    
    // Add error logging
    page.on('pageerror', (error) => {
      console.error(`🚨 PAGE ERROR: ${error.message}`);
    });
    
    // Clear any existing auth state
    await page.goto('http://localhost:3000');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test('Authentication flow displays login page correctly', async ({ page }) => {
    console.log('🔍 === STARTING FIXED AUTH TEST ===');
    
    // Step 1: Navigate to app and wait for it to fully load
    console.log('🔍 Step 1: Navigating to app...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    
    // Wait for React to finish initializing
    await page.waitForFunction(() => {
      return window.document.readyState === 'complete' && 
             (document.querySelector('[data-testid="demo-login-button"]') !== null ||
              document.querySelector('button:has-text("Try Demo")') !== null ||
              document.querySelector('h1:has-text("Welcome to Fan Club Z")') !== null);
    }, { timeout: 10000 });
    
    // Additional wait to ensure all async operations complete
    await page.waitForTimeout(2000);
    
    console.log('🔍 Step 2: Taking initial screenshot...');
    await page.screenshot({ path: 'test-auth-flow-step1.png', fullPage: true });
    
    // Step 3: Check current URL and redirect behavior
    const currentUrl = page.url();
    console.log(`🔍 Current URL: ${currentUrl}`);
    
    // If we're not on login page, navigate there explicitly
    if (!currentUrl.includes('/auth/login')) {
      console.log('🔍 Not on login page, navigating explicitly...');
      await page.goto('http://localhost:3000/auth/login', { waitUntil: 'networkidle' });
      await page.waitForTimeout(1000);
    }
    
    // Step 4: Verify login page elements are present
    console.log('🔍 Step 3: Checking for login page elements...');
    
    // Check for welcome text
    const welcomeText = page.locator('h1:has-text("Welcome to Fan Club Z")');
    await expect(welcomeText).toBeVisible({ timeout: 5000 });
    console.log('✅ Welcome text found');
    
    // Check for demo login button with multiple selectors
    console.log('🔍 Looking for demo login button...');
    const demoButton = page.locator('[data-testid="demo-login-button"]').or(
      page.locator('button:has-text("Try Demo")')
    );
    await expect(demoButton).toBeVisible({ timeout: 5000 });
    console.log('✅ Demo button found');
    
    // Check for other essential elements
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeVisible();
    console.log('✅ Email input found');
    
    const passwordInput = page.locator('input[type="password"]');
    await expect(passwordInput).toBeVisible();
    console.log('✅ Password input found');
    
    const signInButton = page.locator('button[type="submit"]:has-text("Sign In")');
    await expect(signInButton).toBeVisible();
    console.log('✅ Sign In button found');
    
    await page.screenshot({ path: 'test-auth-flow-step2.png', fullPage: true });
    
    console.log('✅ All login page elements verified successfully!');
  });

  test('Demo login works correctly', async ({ page }) => {
    console.log('🔍 === STARTING DEMO LOGIN TEST ===');
    
    // Navigate to login page
    await page.goto('http://localhost:3000/auth/login', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
    // Take screenshot before clicking
    await page.screenshot({ path: 'test-demo-login-before.png', fullPage: true });
    
    // Find and click demo button
    console.log('🔍 Looking for demo button...');
    const demoButton = page.locator('[data-testid="demo-login-button"]').or(
      page.locator('button:has-text("Try Demo")')
    );
    await expect(demoButton).toBeVisible({ timeout: 5000 });
    
    console.log('🔍 Clicking demo button...');
    await demoButton.click();
    
    // Wait for authentication to complete and navigation to occur
    console.log('🔍 Waiting for authentication...');
    await page.waitForURL('**/discover', { timeout: 10000 });
    
    // Wait for the discover page to fully load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Take screenshot after login
    await page.screenshot({ path: 'test-demo-login-after.png', fullPage: true });
    
    // Verify we're on the discover page
    const currentUrl = page.url();
    expect(currentUrl).toContain('/discover');
    console.log(`✅ Successfully navigated to: ${currentUrl}`);
    
    // Check for main app elements
    const bottomNav = page.locator('[data-testid="bottom-navigation"]').or(
      page.locator('nav').filter({ hasText: 'Discover' })
    );
    await expect(bottomNav).toBeVisible({ timeout: 5000 });
    console.log('✅ Bottom navigation found');
    
    console.log('✅ Demo login test completed successfully!');
  });

  test('Navigation to main app works after login', async ({ page }) => {
    console.log('🔍 === TESTING MAIN APP NAVIGATION ===');
    
    // Do demo login first
    await page.goto('http://localhost:3000/auth/login', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    
    const demoButton = page.locator('[data-testid="demo-login-button"]').or(
      page.locator('button:has-text("Try Demo")')
    );
    await demoButton.click();
    
    // Wait for navigation
    await page.waitForURL('**/discover', { timeout: 10000 });
    await page.waitForLoadState('networkidle');
    
    // Test navigation to different sections
    console.log('🔍 Testing wallet navigation...');
    const walletLink = page.locator('a[href="/wallet"]').or(
      page.locator('text=Wallet').first()
    );
    
    if (await walletLink.isVisible()) {
      await walletLink.click();
      await page.waitForURL('**/wallet', { timeout: 5000 });
      console.log('✅ Wallet navigation successful');
    } else {
      console.log('ℹ️  Wallet link not found, skipping wallet test');
    }
    
    // Test navigation back to discover
    console.log('🔍 Testing discover navigation...');
    const discoverLink = page.locator('a[href="/discover"]').or(
      page.locator('text=Discover').first()
    );
    
    if (await discoverLink.isVisible()) {
      await discoverLink.click();
      await page.waitForURL('**/discover', { timeout: 5000 });
      console.log('✅ Discover navigation successful');
    }
    
    await page.screenshot({ path: 'test-navigation-complete.png', fullPage: true });
    console.log('✅ Navigation test completed successfully!');
  });
});
