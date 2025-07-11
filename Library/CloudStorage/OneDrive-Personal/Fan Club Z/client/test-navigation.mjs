import { chromium } from '@playwright/test';

async function testNavigation() {
  console.log('🧪 Testing Bottom Navigation...\n');
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    // Navigate to the app
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    
    // Wait for the page to load
    await page.waitForTimeout(2000);
    
    // Check if bottom navigation exists
    console.log('🔍 Checking for bottom navigation...');
    
    // Take a screenshot to see what's visible
    await page.screenshot({ path: 'navigation-test.png', fullPage: true });
    console.log('📸 Screenshot saved as navigation-test.png');
    
    // Check for navigation elements
    const navElements = await page.locator('button').all();
    console.log(`Found ${navElements.length} buttons on the page`);
    
    // Check for specific navigation text
    const discoverButton = await page.locator('button:has-text("Discover")').count();
    const myBetsButton = await page.locator('button:has-text("My Bets")').count();
    const createButton = await page.locator('button:has-text("Create")').count();
    const clubsButton = await page.locator('button:has-text("Clubs")').count();
    const profileButton = await page.locator('button:has-text("Profile")').count();
    
    console.log(`Navigation buttons found:`);
    console.log(`  Discover: ${discoverButton}`);
    console.log(`  My Bets: ${myBetsButton}`);
    console.log(`  Create: ${createButton}`);
    console.log(`  Clubs: ${clubsButton}`);
    console.log(`  Profile: ${profileButton}`);
    
    // Check for any elements with navigation-related classes
    const navClasses = await page.locator('[class*="nav"], [class*="bottom"], [class*="fixed"]').count();
    console.log(`Elements with nav/bottom/fixed classes: ${navClasses}`);
    
    // Check page height and viewport
    const pageHeight = await page.evaluate(() => document.body.scrollHeight);
    const viewportHeight = await page.evaluate(() => window.innerHeight);
    console.log(`Page height: ${pageHeight}px, Viewport height: ${viewportHeight}px`);
    
    // Check if we need to scroll down to see navigation
    if (pageHeight > viewportHeight) {
      console.log('📜 Page is scrollable, checking if navigation is at bottom...');
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'navigation-test-bottom.png', fullPage: true });
      console.log('📸 Bottom screenshot saved as navigation-test-bottom.png');
    }
    
    // Try to find navigation by looking for fixed positioned elements
    const fixedElements = await page.locator('[style*="position: fixed"], [style*="position:fixed"]').count();
    console.log(`Fixed positioned elements: ${fixedElements}`);
    
    // Check for elements with bottom positioning
    const bottomElements = await page.locator('[style*="bottom:"], [class*="bottom-"]').count();
    console.log(`Elements with bottom positioning: ${bottomElements}`);
    
  } catch (error) {
    console.log('❌ Test error:', error.message);
  } finally {
    await browser.close();
  }
}

testNavigation().catch(console.error); 