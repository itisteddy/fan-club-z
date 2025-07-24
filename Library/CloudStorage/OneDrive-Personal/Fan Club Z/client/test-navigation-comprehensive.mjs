import { chromium } from '@playwright/test';

async function testBottomNavigation() {
  console.log('🧪 Testing Bottom Navigation Functionality...');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 1000 // Slow down for better visibility
  });
  
  const page = await browser.newPage();
  
  try {
    // Navigate to the app
    console.log('📍 Navigating to localhost:3000...');
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    console.log('📍 Current URL:', page.url());
    
    // Check if we're redirected to login
    const isLoginPage = await page.locator('text=Welcome to Fan Club Z').isVisible();
    console.log('🔍 On login page:', isLoginPage);
    
    if (isLoginPage) {
      // Try demo login if available
      const demoButton = page.locator('button:has-text("Try Demo")');
      const demoExists = await demoButton.isVisible();
      console.log('🔍 Demo button exists:', demoExists);
      
      if (demoExists) {
        console.log('🚀 Clicking demo login...');
        await demoButton.click();
        await page.waitForTimeout(3000);
        console.log('📍 URL after demo login:', page.url());
      }
    }
    
    // Check for bottom navigation
    console.log('🔍 Looking for bottom navigation...');
    const bottomNav = page.locator('[data-testid="bottom-navigation"]');
    const navExists = await bottomNav.isVisible();
    console.log('✅ Bottom navigation visible:', navExists);
    
    if (navExists) {
      // Test each navigation tab
      const tabs = [
        { testId: 'nav-discover', expectedUrl: '/discover', label: 'Discover' },
        { testId: 'nav-my-bets', expectedUrl: '/bets', label: 'My Bets' },
        { testId: 'nav-clubs', expectedUrl: '/clubs', label: 'Clubs' },
        { testId: 'nav-profile', expectedUrl: '/profile', label: 'Profile' }
      ];
      
      for (const tab of tabs) {
        try {
          console.log(`🔄 Testing ${tab.label} tab...`);
          
          const tabButton = page.locator(`[data-testid="${tab.testId}"]`);
          const tabVisible = await tabButton.isVisible();
          console.log(`  📱 ${tab.label} button visible: ${tabVisible}`);
          
          if (tabVisible) {
            await tabButton.click();
            await page.waitForTimeout(1500);
            
            const currentUrl = page.url();
            const correctUrl = currentUrl.includes(tab.expectedUrl);
            console.log(`  📍 Navigation result: ${currentUrl} (expected: ${tab.expectedUrl}) ✅: ${correctUrl}`);
            
            // Check if the page content loaded
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(1000);
            
            // Take a screenshot
            await page.screenshot({ 
              path: `navigation-test-${tab.label.toLowerCase().replace(' ', '-')}.png`,
              fullPage: true 
            });
            console.log(`  📸 Screenshot saved for ${tab.label}`);
          }
        } catch (error) {
          console.log(`  ❌ Error testing ${tab.label}: ${error.message}`);
        }
      }
      
      console.log('✅ Navigation test completed!');
    } else {
      console.log('❌ Bottom navigation not found');
      
      // Debug what's actually on the page
      const pageContent = await page.content();
      const hasBottomNav = pageContent.includes('bottom-navigation');
      const hasNavButtons = pageContent.includes('nav-discover');
      
      console.log('🔍 Debug info:');
      console.log('  - Page contains "bottom-navigation":', hasBottomNav);
      console.log('  - Page contains nav buttons:', hasNavButtons);
      
      // Take screenshot for debugging
      await page.screenshot({ path: 'navigation-debug-failed.png', fullPage: true });
      console.log('📸 Debug screenshot saved');
    }
    
  } catch (error) {
    console.log('❌ Test error:', error.message);
    await page.screenshot({ path: 'navigation-test-error.png', fullPage: true });
  } finally {
    await browser.close();
  }
}

// Run the test
testBottomNavigation().catch(console.error);
