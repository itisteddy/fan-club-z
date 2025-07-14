import { test, expect } from '@playwright/test';

test.describe('Debug: Minimal App Test', () => {
  test('should load the homepage and find demo button', async ({ page }) => {
    console.log('🔍 Starting minimal app test...');
    
    // Add console logging
    page.on('console', msg => console.log('BROWSER:', msg.text()));
    page.on('pageerror', error => console.error('PAGE ERROR:', error.message));
    
    console.log('📍 Navigating to localhost:3000...');
    await page.goto('http://localhost:3000');
    
    console.log('⏳ Waiting for page to load...');
    await page.waitForLoadState('networkidle');
    
    console.log('📸 Taking screenshot...');
    await page.screenshot({ path: 'minimal-test-loaded.png', fullPage: true });
    
    console.log('🔍 Looking for demo button...');
    const demoButton = page.locator('button:has-text("Try Demo")');
    
    // Wait up to 10 seconds for demo button
    await expect(demoButton).toBeVisible({ timeout: 10000 });
    console.log('✅ Demo button found!');
    
    console.log('🖱️ Clicking demo button...');
    await demoButton.click();
    
    console.log('⏳ Waiting for navigation after demo login...');
    await page.waitForTimeout(5000);
    
    console.log('📸 Taking screenshot after demo click...');
    await page.screenshot({ path: 'minimal-test-after-demo.png', fullPage: true });
    
    // Check if we have bottom navigation or some sign of successful login
    console.log('🔍 Looking for bottom navigation...');
    const bottomNav = page.locator('[data-testid="bottom-navigation"]');
    await expect(bottomNav).toBeVisible({ timeout: 10000 });
    console.log('✅ Bottom navigation found!');
    
    console.log('🎉 Minimal test completed successfully!');
  });
  
  test('should be able to navigate to clubs', async ({ page }) => {
    console.log('🔍 Starting clubs navigation test...');
    
    // Login first
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    
    await page.locator('button:has-text("Try Demo")').click();
    await page.waitForTimeout(3000);
    
    // Try to navigate to clubs
    console.log('🖱️ Clicking clubs tab...');
    const clubsTab = page.locator('[data-testid="nav-clubs"]');
    await expect(clubsTab).toBeVisible({ timeout: 10000 });
    await clubsTab.click();
    
    console.log('⏳ Waiting for clubs page to load...');
    await page.waitForTimeout(3000);
    
    console.log('📸 Taking screenshot of clubs page...');
    await page.screenshot({ path: 'minimal-test-clubs.png', fullPage: true });
    
    // Check for clubs header
    console.log('🔍 Looking for clubs header...');
    const clubsHeader = page.locator('header h1:has-text("Clubs")');
    await expect(clubsHeader).toBeVisible({ timeout: 10000 });
    console.log('✅ Clubs header found!');
    
    console.log('🎉 Clubs navigation test completed successfully!');
  });
});
