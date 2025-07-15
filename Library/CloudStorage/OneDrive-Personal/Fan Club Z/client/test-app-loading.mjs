import { chromium } from 'playwright';

const testAppLoading = async () => {
  console.log('🔍 Testing App Loading...\n');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 1000 
  });
  
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 }, // iPhone 14
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
  });
  
  const page = await context.newPage();
  
  try {
    // Navigate to the app
    console.log('📍 Navigating to app...');
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    
    // Wait longer for React to load
    console.log('⏳ Waiting for React to load...');
    await page.waitForTimeout(5000);
    
    // Check if the page loaded
    const title = await page.title();
    console.log('📄 Page title:', title);
    
    // Check for any React errors
    const errors = await page.evaluate(() => {
      return window.console?.errors || [];
    });
    
    if (errors.length > 0) {
      console.log('❌ Console errors found:', errors);
    } else {
      console.log('✅ No console errors found');
    }
    
    // Check for React app mounting
    const reactRoot = await page.locator('#root').count();
    console.log('🔍 React root found:', reactRoot > 0);
    
    // Check for any content
    const bodyText = await page.locator('body').textContent();
    console.log('📝 Body text preview:', bodyText?.substring(0, 200));
    
    // Check for navigation elements
    console.log('\n🔍 Looking for navigation elements...');
    
    // Try different selectors
    const selectors = [
      '[data-testid="bottom-navigation"]',
      '.bottom-navigation',
      'nav',
      '[role="navigation"]',
      'button[data-testid^="nav-"]',
      'button:has-text("Discover")',
      'button:has-text("My Bets")',
      'button:has-text("Clubs")',
      'button:has-text("Profile")'
    ];
    
    for (const selector of selectors) {
      const count = await page.locator(selector).count();
      console.log(`  ${selector}: ${count} found`);
    }
    
    // Check for any buttons
    const allButtons = await page.locator('button').all();
    console.log(`\n🔘 Total buttons found: ${allButtons.length}`);
    
    for (let i = 0; i < Math.min(allButtons.length, 10); i++) {
      const text = await allButtons[i].textContent();
      const testId = await allButtons[i].getAttribute('data-testid');
      console.log(`  Button ${i + 1}: "${text}" (testid: ${testId})`);
    }
    
    // Take a screenshot
    await page.screenshot({ path: 'app-loading-debug.png', fullPage: true });
    console.log('\n📸 Screenshot saved as app-loading-debug.png');
    
    // Check if we can find any navigation at all
    const hasNavigation = await page.locator('button:has-text("Discover")').count() > 0 ||
                         await page.locator('button:has-text("My Bets")').count() > 0 ||
                         await page.locator('button:has-text("Clubs")').count() > 0 ||
                         await page.locator('button:has-text("Profile")').count() > 0;
    
    if (hasNavigation) {
      console.log('\n✅ Navigation elements found!');
    } else {
      console.log('\n❌ No navigation elements found');
    }
    
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    
    // Take a screenshot for debugging
    await page.screenshot({ path: 'app-loading-error.png', fullPage: true });
    console.log('📸 Error screenshot saved as app-loading-error.png');
    
    throw error;
  } finally {
    await browser.close();
  }
};

// Run the test
testAppLoading().catch(console.error); 