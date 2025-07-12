#!/usr/bin/env node

const { chromium } = require('playwright');

async function testBottomNavigationFix() {
  console.log('🔍 Testing Bottom Navigation Fix...');
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    // Listen for console messages
    page.on('console', msg => {
      console.log('📟 BROWSER:', msg.text());
    });

    // Go to the login page
    console.log('📍 Navigating to login page...');
    await page.goto('http://localhost:3000/auth/login');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Check if login page loads
    console.log('✅ Checking if login page loads...');
    await page.waitForSelector('text=Welcome to Fan Club Z', { timeout: 10000 });
    console.log('✅ Login page loaded successfully');

    // Click demo login
    console.log('🚀 Clicking demo login...');
    await page.click('button:has-text("Try Demo")');
    
    // Wait for redirect and page load
    console.log('⏳ Waiting for demo login to complete...');
    await page.waitForTimeout(3000);
    
    // Check current URL
    const currentUrl = page.url();
    console.log('📍 Current URL after demo login:', currentUrl);
    
    // Wait for discover page to load
    if (currentUrl.includes('/discover')) {
      console.log('✅ Successfully redirected to discover page');
      
      // Check if bottom navigation is present
      console.log('🔍 Checking for bottom navigation...');
      const bottomNav = await page.locator('[data-testid="bottom-navigation"]');
      const isVisible = await bottomNav.isVisible();
      
      console.log('📱 Bottom navigation visible:', isVisible);
      
      if (isVisible) {
        console.log('🎉 SUCCESS! Bottom navigation is now visible!');
        
        // Test navigation by clicking different tabs
        console.log('🧪 Testing tab navigation...');
        
        const tabs = [
          { name: 'Discover', selector: 'text=Discover' },
          { name: 'Clubs', selector: 'text=Clubs' },
          { name: 'Profile', selector: 'text=Profile' }
        ];
        
        for (const tab of tabs) {
          console.log(`🔄 Testing ${tab.name} tab...`);
          await page.locator(tab.selector).click();
          await page.waitForTimeout(1000);
          
          // Check if bottom navigation is still visible
          const stillVisible = await bottomNav.isVisible();
          console.log(`📱 Bottom navigation visible on ${tab.name} tab:`, stillVisible);
          
          if (!stillVisible) {
            console.log(`❌ Bottom navigation disappeared on ${tab.name} tab!`);
            break;
          }
        }
        
        console.log('🎉 All navigation tests passed!');
        return true;
      } else {
        console.log('❌ Bottom navigation is still not visible');
        
        // Take a screenshot for debugging
        await page.screenshot({ path: 'bottom-nav-debug.png' });
        console.log('📸 Screenshot saved: bottom-nav-debug.png');
        
        return false;
      }
    } else {
      console.log('❌ Not redirected to discover page. Current URL:', currentUrl);
      return false;
    }
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    return false;
  } finally {
    await browser.close();
  }
}

// Run the test
testBottomNavigationFix()
  .then(success => {
    if (success) {
      console.log('🎉 BOTTOM NAVIGATION FIX VERIFIED!');
      process.exit(0);
    } else {
      console.log('❌ Bottom navigation fix needs more work');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('💥 Test script failed:', error);
    process.exit(1);
  });
