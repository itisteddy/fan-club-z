import { chromium } from '@playwright/test';

async function debugDemoButton() {
  console.log('🔍 Debugging Demo Button...\n');
  
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Navigate to app
    console.log('📱 Loading app...');
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Click Sign In to get to login page
    console.log('\n🔐 Step 1: Going to login page');
    await page.click('button:has-text("Sign In")');
    await page.waitForTimeout(1000);
    
    // Check what's on the login page
    console.log('\n📋 Step 2: Login page content');
    const pageText = await page.evaluate(() => {
      return document.body.innerText;
    });
    console.log('   Page text:');
    console.log('   ' + pageText.substring(0, 500) + '...');
    
    // Look for demo button
    console.log('\n🔘 Step 3: Looking for demo button');
    const tryDemoButton = await page.locator('text=Try Demo').count();
    console.log(`   Try Demo button found: ${tryDemoButton > 0 ? '✅' : '❌'}`);
    
    if (tryDemoButton > 0) {
      // Monitor network requests
      console.log('\n🌐 Step 4: Monitoring network requests');
      
      const networkRequests = [];
      page.on('request', request => {
        networkRequests.push({
          method: request.method(),
          url: request.url(),
          timestamp: new Date().toISOString()
        });
      });
      
      const networkResponses = [];
      page.on('response', response => {
        networkResponses.push({
          method: response.request().method(),
          url: response.url(),
          status: response.status(),
          timestamp: new Date().toISOString()
        });
      });
      
      // Click demo button
      console.log('   Clicking Try Demo button...');
      await page.click('text=Try Demo');
      await page.waitForTimeout(3000);
      
      // Check network activity
      console.log('\n📊 Step 5: Network activity analysis');
      console.log('   Requests made:');
      networkRequests.forEach((req, i) => {
        console.log(`     ${i + 1}. ${req.method} ${req.url}`);
      });
      
      console.log('   Responses received:');
      networkResponses.forEach((res, i) => {
        console.log(`     ${i + 1}. ${res.method} ${res.url} - ${res.status}`);
      });
      
      // Check if authentication happened
      console.log('\n🔑 Step 6: Authentication check');
      const isAuthenticated = await page.evaluate(() => {
        return localStorage.getItem('auth_token') !== null;
      });
      console.log(`   Is authenticated: ${isAuthenticated}`);
      
      // Check current URL
      const currentUrl = page.url();
      console.log(`   Current URL: ${currentUrl}`);
      
      // Check page content after demo click
      const newPageText = await page.evaluate(() => {
        return document.body.innerText;
      });
      console.log('   New page content:');
      console.log('   ' + newPageText.substring(0, 300) + '...');
      
    } else {
      console.log('   ❌ Try Demo button not found');
    }
    
  } catch (error) {
    console.log('❌ Debug error:', error.message);
  } finally {
    await context.close();
    await browser.close();
  }
  
  console.log('\n🎯 Demo button debugging complete!');
}

debugDemoButton().catch(console.error); 