import { test, expect } from '@playwright/test';

test('Debug console errors and app loading', async ({ page }) => {
  console.log('🔍 Debugging console errors and app loading...');
  
  const consoleMessages: string[] = [];
  const errors: string[] = [];
  
  // Listen for console messages
  page.on('console', msg => {
    consoleMessages.push(`${msg.type()}: ${msg.text()}`);
    console.log(`📱 Console ${msg.type()}:`, msg.text());
  });
  
  // Listen for page errors
  page.on('pageerror', error => {
    errors.push(error.message);
    console.log('❌ Page error:', error.message);
  });
  
  await page.goto('http://localhost:3000');
  
  // Wait for page to load
  await page.waitForLoadState('networkidle');
  
  // Wait a bit more for React to render
  await page.waitForTimeout(2000);
  
  // Check if React is loaded
  const reactLoaded = await page.evaluate(() => {
    return typeof window !== 'undefined' && 
           typeof window.React !== 'undefined' &&
           document.querySelector('#root') !== null;
  });
  
  console.log('⚛️ React loaded:', reactLoaded);
  
  // Check root element content
  const rootContent = await page.evaluate(() => {
    const root = document.querySelector('#root');
    return root ? root.innerHTML.substring(0, 500) : 'No root element found';
  });
  
  console.log('🌳 Root content:', rootContent);
  
  // Check for any loading indicators
  const loadingElements = await page.locator('[class*="loading"], [class*="Loading"], [class*="spinner"], [class*="Loading"]').all();
  console.log('⏳ Loading elements found:', loadingElements.length);
  
  // Check for any error boundaries
  const errorElements = await page.locator('[class*="error"], [class*="Error"]').all();
  console.log('🚨 Error elements found:', errorElements.length);
  
  // Take a screenshot
  await page.screenshot({ path: 'debug-console-errors.png', fullPage: true });
  
  console.log('📊 Summary:');
  console.log('- Console messages:', consoleMessages.length);
  console.log('- Page errors:', errors.length);
  console.log('- React loaded:', reactLoaded);
  console.log('- Loading elements:', loadingElements.length);
  console.log('- Error elements:', errorElements.length);
  
  // The page should load without critical errors
  expect(errors.length).toBeLessThan(5); // Allow some non-critical errors
}); 