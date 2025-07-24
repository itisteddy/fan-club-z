import { chromium } from '@playwright/test';

async function testBottomNavigation() {
  console.log('🧪 Testing Bottom Navigation - All Tabs...\n');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 500 // Slow down for better visibility
  });
  
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 }, // iPhone 14 size
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15'
  });
  
  const page = await context.newPage();
  
  // Listen for console errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('🔥 BROWSER ERROR:', msg.text());
    }
  });
  
  page.on('pageerror', error => {
    console.log('💥 PAGE ERROR:', error.message);
  });
  
  try {
    // Navigate to the app
    console.log('📍 Navigating to localhost:3000...');
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    console.log('📍 Current URL:', page.url());
    
    // Check if we're on login page
    const isLoginPage = await page.locator('text=Welcome to Fan Club Z').isVisible();
    console.log('🔍 On login page:', isLoginPage);
    
    if (isLoginPage) {
      // Try demo login
      const demoButton = page.locator('button:has-text("Try Demo")');
      const demoExists = await demoButton.isVisible();
      console.log('🔍 Demo button exists:', demoExists);
      
      if (demoExists) {
        console.log('🚀 Clicking demo login...');
        await demoButton.click();
        await page.waitForTimeout(3000);
        console.log('📍 URL after demo login:', page.url());
      } else {
        // Look for other login options
        console.log('🔍 Looking for other login options...');
        const allButtons = await page.locator('button').allTextContents();
        console.log('Available buttons:', allButtons);
      }
    }
    
    // Wait for bottom navigation to appear
    console.log('🔍 Looking for bottom navigation...');
    
    // Try multiple selectors to find the navigation
    const navSelectors = [
      '[data-testid="bottom-navigation"]',
      '.fixed.bottom-0',
      '[class*="bottom-navigation"]',
      '.bottom-nav'
    ];
    
    let bottomNav = null;
    let navExists = false;
    
    for (const selector of navSelectors) {
      try {
        bottomNav = page.locator(selector);
        navExists = await bottomNav.isVisible();
        if (navExists) {
          console.log(`✅ Found navigation with selector: ${selector}`);
          break;
        }
      } catch (e) {
        // Continue to next selector
      }
    }
    
    console.log('📱 Bottom navigation visible:', navExists);
    
    if (navExists) {
      console.log('\n🎯 Testing Navigation Tabs...\n');
      
      // Define all expected tabs
      const expectedTabs = [
        { 
          testId: 'nav-discover', 
          label: 'Discover', 
          expectedUrl: '/discover',
          shouldHaveFAB: true 
        },
        { 
          testId: 'nav-my-bets', 
          label: 'My Bets', 
          expectedUrl: '/bets',
          shouldHaveFAB: true 
        },
        { 
          testId: 'nav-clubs', 
          label: 'Clubs', 
          expectedUrl: '/clubs',
          shouldHaveFAB: false 
        },
        { 
          testId: 'nav-profile', 
          label: 'Profile', 
          expectedUrl: '/profile',
          shouldHaveFAB: false,
          alternateTestId: 'nav-sign-in' // If not logged in
        }
      ];
      
      let passedTests = 0;
      let totalTests = expectedTabs.length;
      
      for (const tab of expectedTabs) {
        try {
          console.log(`🔄 Testing ${tab.label} tab...`);
          
          // Find the tab button
          let tabButton = page.locator(`[data-testid="${tab.testId}"]`);
          let tabVisible = await tabButton.isVisible();
          
          // If primary testId not found, try alternate (for profile/sign-in)
          if (!tabVisible && tab.alternateTestId) {
            tabButton = page.locator(`[data-testid="${tab.alternateTestId}"]`);
            tabVisible = await tabButton.isVisible();
            console.log(`  📱 Using alternate selector for ${tab.label}`);
          }
          
          console.log(`  📱 ${tab.label} button visible: ${tabVisible}`);
          
          if (tabVisible) {
            // Click the tab
            await tabButton.click();
            await page.waitForTimeout(1500);
            
            const currentUrl = page.url();
            const urlMatches = currentUrl.includes(tab.expectedUrl) || 
                              (tab.alternateTestId && currentUrl.includes('/auth/login'));
            
            console.log(`  📍 Navigation result: ${currentUrl}`);
            console.log(`  ✅ URL correct: ${urlMatches}`);
            
            // Check if page content loaded
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(1000);
            
            // Check for Floating Action Button if expected
            if (tab.shouldHaveFAB) {
              const fab = page.locator('[data-testid="floating-action-button"]');
              const fabVisible = await fab.isVisible();
              console.log(`  🔘 FAB visible: ${fabVisible} (expected: ${tab.shouldHaveFAB})`);
            }
            
            // Take a screenshot for each tab
            await page.screenshot({ 
              path: `navigation-test-${tab.label.toLowerCase().replace(' ', '-')}.png`,
              fullPage: true 
            });
            console.log(`  📸 Screenshot saved for ${tab.label}`);
            
            if (urlMatches) {
              passedTests++;
              console.log(`  ✅ ${tab.label} tab test PASSED\n`);
            } else {
              console.log(`  ❌ ${tab.label} tab test FAILED - URL mismatch\n`);
            }
          } else {
            console.log(`  ❌ ${tab.label} button not found\n`);
          }
        } catch (error) {
          console.log(`  💥 Error testing ${tab.label}: ${error.message}\n`);
        }
      }
      
      // Summary
      console.log(`\n📊 Navigation Test Results:`);
      console.log(`✅ Passed: ${passedTests}/${totalTests} tabs`);
      console.log(`📈 Success Rate: ${Math.round((passedTests/totalTests) * 100)}%`);
      
      if (passedTests === totalTests) {
        console.log(`🎉 ALL NAVIGATION TESTS PASSED! 🎉`);
      } else {
        console.log(`⚠️  Some navigation issues found - see details above`);
      }
      
    } else {
      console.log('\n❌ Bottom navigation not found');
      console.log('🔍 Debugging navigation absence...\n');
      
      // Debug what's actually on the page
      const pageContent = await page.content();
      const hasBottomNav = pageContent.includes('bottom-navigation');
      const hasNavButtons = pageContent.includes('nav-discover');
      const hasFixedBottom = pageContent.includes('fixed bottom');
      
      console.log('🔍 Debug checks:');
      console.log(`  - Page contains "bottom-navigation": ${hasBottomNav}`);
      console.log(`  - Page contains "nav-discover": ${hasNavButtons}`);
      console.log(`  - Page contains "fixed bottom": ${hasFixedBottom}`);
      
      // Check for any navigation-like elements
      const possibleNavElements = await page.locator('nav, [class*="nav"], [class*="bottom"]').count();
      console.log(`  - Possible nav elements found: ${possibleNavElements}`);
      
      // Check current page structure
      const bodyClasses = await page.getAttribute('body', 'class');
      console.log(`  - Body classes: ${bodyClasses}`);
      
      // Take screenshot for debugging
      await page.screenshot({ path: 'navigation-debug-missing.png', fullPage: true });
      console.log('📸 Debug screenshot saved as navigation-debug-missing.png');
      
      // Check if we're still on login/onboarding
      const pageTitle = await page.locator('h1').first().textContent();
      console.log(`  - Current page title: ${pageTitle}`);
    }
    
  } catch (error) {
    console.log('\n💥 Test Error:', error.message);
    await page.screenshot({ path: 'navigation-test-error.png', fullPage: true });
    console.log('📸 Error screenshot saved');
  } finally {
    await browser.close();
  }
}

// Run the test
testBottomNavigation().catch(console.error);