#!/usr/bin/env node

const { chromium } = require('playwright');

async function testDemoLogin() {
  console.log('🚀 Starting demo login test...');
  
  const browser = await chromium.launch({ 
    headless: false, // Show browser for debugging
    slowMo: 1000 // Slow down for visibility
  });
  
  const page = await browser.newPage();
  
  try {
    // Navigate to the app
    console.log('📱 Navigating to http://localhost:3000...');
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    
    // Log current URL
    console.log('📍 Current URL:', page.url());
    
    // Take screenshot of initial state
    await page.screenshot({ path: 'debug-initial.png', fullPage: true });
    console.log('📸 Screenshot saved: debug-initial.png');
    
    // Check if we're on the login page
    console.log('🔍 Looking for "Welcome to Fan Club Z" text...');
    
    try {
      await page.locator('text=Welcome to Fan Club Z').waitFor({ timeout: 10000 });
      console.log('✅ Welcome text found!');
    } catch (error) {
      console.log('❌ Welcome text not found. Current page content:');
      const content = await page.content();
      console.log(content.substring(0, 1000) + '...');
      throw error;
    }
    
    // Look for demo button
    console.log('🔍 Looking for "Try Demo" button...');
    const demoButton = page.locator('button:has-text("Try Demo")');
    
    try {
      await demoButton.waitFor({ timeout: 5000 });
      console.log('✅ Try Demo button found!');
    } catch (error) {
      console.log('❌ Try Demo button not found');
      await page.screenshot({ path: 'debug-no-demo-button.png', fullPage: true });
      throw error;
    }
    
    // Click demo button
    console.log('🖱️ Clicking Try Demo button...');
    await demoButton.click();
    
    // Wait for navigation/loading
    console.log('⏳ Waiting for authentication...');
    await page.waitForTimeout(3000);
    
    // Log current URL after demo login
    console.log('📍 URL after demo login:', page.url());
    
    // Take screenshot after demo login
    await page.screenshot({ path: 'debug-after-demo-login.png', fullPage: true });
    console.log('📸 Screenshot saved: debug-after-demo-login.png');
    
    // Look for main app elements
    console.log('🔍 Looking for bottom navigation...');
    
    try {
      await page.locator('[data-testid=\"bottom-navigation\"]').waitFor({ timeout: 10000 });
      console.log('✅ Bottom navigation found!');
    } catch (error) {
      console.log('❌ Bottom navigation not found. Looking for compliance manager...');
      
      const complianceVisible = await page.locator('text=Before you start betting').isVisible();
      if (complianceVisible) {
        console.log('⚠️ Compliance manager is showing, this should auto-skip for demo user');
        await page.screenshot({ path: 'debug-compliance-showing.png', fullPage: true });
      }
      
      throw error;
    }
    
    // Check for discover tab
    console.log('🔍 Looking for Discover tab...');
    
    try {
      await page.locator('text=Discover').waitFor({ timeout: 5000 });
      console.log('✅ Discover tab found!');
    } catch (error) {
      console.log('❌ Discover tab not found');
      throw error;
    }
    
    console.log('🎉 Demo login test completed successfully!');
    
  } catch (error) {
    console.error('💥 Test failed:', error.message);
    
    // Take final screenshot on error
    await page.screenshot({ path: 'debug-error.png', fullPage: true });
    console.log('📸 Error screenshot saved: debug-error.png');
    
    // Log browser console messages
    console.log('📝 Browser console messages:');
    page.on('console', msg => console.log('BROWSER:', msg.text()));
    
  } finally {
    // Keep browser open for inspection
    console.log('🔍 Browser will stay open for inspection. Close manually when done.');
    // await browser.close();
  }
}

testDemoLogin().catch(console.error);
