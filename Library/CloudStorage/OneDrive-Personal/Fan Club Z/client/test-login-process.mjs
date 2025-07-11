import { chromium } from '@playwright/test';

async function testLoginProcess() {
  console.log('🔐 Testing Login Process...\n');
  
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Navigate to app
    console.log('📱 Loading app...');
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Click Sign In
    console.log('\n🔐 Step 1: Opening login page');
    await page.click('button:has-text("Sign In")');
    await page.waitForTimeout(1000);
    
    // Fill demo credentials
    console.log('\n📝 Step 2: Filling demo credentials');
    await page.fill('input[placeholder="Enter your email"]', 'demo@fanclubz.app');
    await page.fill('input[placeholder="Enter your password"]', 'demo123');
    
    // Check network requests
    console.log('\n🌐 Step 3: Monitoring network requests');
    
    // Listen for network requests
    const requests = [];
    page.on('request', request => {
      if (request.url().includes('/api/')) {
        requests.push({
          url: request.url(),
          method: request.method(),
          headers: request.headers()
        });
      }
    });
    
    const responses = [];
    page.on('response', response => {
      if (response.url().includes('/api/')) {
        responses.push({
          url: response.url(),
          status: response.status(),
          statusText: response.statusText()
        });
      }
    });
    
    // Click Sign In button
    console.log('\n🚀 Step 4: Submitting login form');
    await page.click('button:has-text("Sign In")');
    await page.waitForTimeout(3000);
    
    // Check what happened
    console.log('\n📊 Step 5: Analyzing results');
    
    // Check current URL
    const currentUrl = page.url();
    console.log(`   Current URL: ${currentUrl}`);
    
    // Check for error messages
    const errorMessages = await page.locator('text=Login failed').count();
    if (errorMessages > 0) {
      console.log('   ❌ Login failed message found');
    }
    
    // Check for success indicators
    const discoverText = await page.locator('text=Discover').count();
    const profileText = await page.locator('text=Profile').count();
    
    console.log(`   Discover text found: ${discoverText}`);
    console.log(`   Profile text found: ${profileText}`);
    
    // Check network requests
    console.log('\n🌐 Network Requests:');
    requests.forEach(req => {
      console.log(`   ${req.method} ${req.url}`);
    });
    
    console.log('\n🌐 Network Responses:');
    responses.forEach(res => {
      console.log(`   ${res.status} ${res.statusText} - ${res.url}`);
    });
    
    // Check localStorage
    console.log('\n💾 LocalStorage Check:');
    const authToken = await page.evaluate(() => localStorage.getItem('auth_token'));
    const accessToken = await page.evaluate(() => localStorage.getItem('accessToken'));
    
    console.log(`   auth_token: ${authToken ? 'Present' : 'Missing'}`);
    console.log(`   accessToken: ${accessToken ? 'Present' : 'Missing'}`);
    
    // Check if we're authenticated
    const isAuthenticated = await page.evaluate(() => {
      return localStorage.getItem('auth_token') !== null;
    });
    
    console.log(`   Is authenticated: ${isAuthenticated}`);
    
    if (isAuthenticated) {
      console.log('\n✅ Login successful!');
      
      // Try to navigate to Profile - look for user avatar instead of "Profile" text
      console.log('\n👤 Step 6: Testing Profile navigation');
      
      // Look for the user avatar in the bottom navigation
      const userAvatar = await page.locator('div[class*="w-6 h-6 rounded-full"]').count();
      console.log(`   User avatar found: ${userAvatar}`);
      
      if (userAvatar > 0) {
        // Click the user avatar (Profile tab)
        await page.click('div[class*="w-6 h-6 rounded-full"]');
        await page.waitForTimeout(2000);
        
        const profileElements = [
          'text=Profile',
          'text=Demo User',
          'text=@demo',
          'text=Edit Profile',
          'text=Sign Out'
        ];
        
        for (const selector of profileElements) {
          const count = await page.locator(selector).count();
          console.log(`   ${selector}: ${count > 0 ? '✅ Found' : '❌ Not found'}`);
        }
      } else {
        console.log('   ❌ User avatar not found in navigation');
        
        // Try clicking the last tab (should be Profile)
        const navButtons = await page.locator('button[class*="flex flex-col items-center justify-center"]').count();
        console.log(`   Total navigation buttons: ${navButtons}`);
        
        if (navButtons >= 5) {
          // Click the last button (Profile)
          await page.locator('button[class*="flex flex-col items-center justify-center"]').nth(4).click();
          await page.waitForTimeout(2000);
          
          const profileElements = [
            'text=Profile',
            'text=Demo User',
            'text=@demo',
            'text=Edit Profile',
            'text=Sign Out'
          ];
          
          for (const selector of profileElements) {
            const count = await page.locator(selector).count();
            console.log(`   ${selector}: ${count > 0 ? '✅ Found' : '❌ Not found'}`);
          }
        }
      }
    } else {
      console.log('\n❌ Login failed');
    }
    
  } catch (error) {
    console.log('❌ Test error:', error.message);
  } finally {
    await context.close();
    await browser.close();
  }
  
  console.log('\n🎯 Login process testing complete!');
}

testLoginProcess().catch(console.error); 