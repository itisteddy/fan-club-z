import { test, expect } from '@playwright/test';

test('Debug page content', async ({ page }) => {
  console.log('🔍 Debugging page content...');
  
  await page.goto('http://localhost:3000');
  
  // Wait for page to load
  await page.waitForLoadState('networkidle');
  
  // Take a screenshot
  await page.screenshot({ path: 'debug-page-content.png', fullPage: true });
  
  // Get page title
  const title = await page.title();
  console.log('📄 Page title:', title);
  
  // Get all text content
  const bodyText = await page.textContent('body');
  console.log('📝 Body text (first 500 chars):', bodyText?.substring(0, 500));
  
  // Check if there are any buttons
  const buttons = await page.locator('button').all();
  console.log('🔘 Number of buttons found:', buttons.length);
  
  // List all button texts
  for (let i = 0; i < buttons.length; i++) {
    const buttonText = await buttons[i].textContent();
    console.log(`🔘 Button ${i + 1}:`, buttonText?.trim());
  }
  
  // Check current URL
  const currentUrl = page.url();
  console.log('📍 Current URL:', currentUrl);
  
  // Check if there are any h1 elements
  const h1Elements = await page.locator('h1').all();
  console.log('📋 Number of h1 elements:', h1Elements.length);
  
  for (let i = 0; i < h1Elements.length; i++) {
    const h1Text = await h1Elements[i].textContent();
    console.log(`📋 H1 ${i + 1}:`, h1Text?.trim());
  }
  
  // Check if there are any div elements with text
  const divsWithText = await page.locator('div:has-text("Welcome")').all();
  console.log('📦 Number of divs with "Welcome" text:', divsWithText.length);
  
  // The page should load successfully
  expect(page.url()).toBe('http://localhost:3000/');
}); 