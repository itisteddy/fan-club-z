import { chromium } from '@playwright/test';

async function debugClubsTimeout() {
  console.log('🧪 Starting clubs timeout debug...');
  
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Enhanced logging
  page.on('console', msg => console.log('📟 BROWSER:', msg.text()));
  page.on('pageerror', error => console.error('🚨 PAGE ERROR:', error.message));
  page.on('requestfailed', request => console.error('❌ REQUEST FAILED:', request.url(), request.failure()?.errorText));
  
  try {
    console.log('🌐 Navigating to app...');
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    
    console.log('🔍 Looking for Try Demo button...');
    const demoButton = await page.locator('button:has-text("Try Demo")');
    const isVisible = await demoButton.isVisible();
    console.log('👀 Try Demo button visible:', isVisible);
    
    if (!isVisible) {
      console.log('❌ Demo button not found, taking screenshot...');
      await page.screenshot({ path: 'debug-no-demo-button.png', fullPage: true });
      throw new Error('Demo button not found');
    }
    
    console.log('👆 Clicking Try Demo...');
    await demoButton.click();
    
    console.log('⏳ Waiting 5 seconds for login to complete...');
    await page.waitForTimeout(5000);
    
    console.log('📍 Current URL:', page.url());
    
    console.log('🔍 Looking for bottom navigation...');
    const bottomNav = await page.locator('[data-testid="bottom-navigation"]');
    const bottomNavVisible = await bottomNav.isVisible();
    console.log('👀 Bottom navigation visible:', bottomNavVisible);
    
    if (!bottomNavVisible) {
      console.log('❌ Bottom navigation not found, taking screenshot...');
      await page.screenshot({ path: 'debug-no-bottom-nav.png', fullPage: true });
      throw new Error('Bottom navigation not found');
    }
    
    console.log('🔍 Looking for Clubs button in bottom nav...');
    const clubsButton = await page.locator('[data-testid="bottom-navigation"] >> text=Clubs');
    const clubsButtonVisible = await clubsButton.isVisible();
    console.log('👀 Clubs button visible:', clubsButtonVisible);
    
    if (!clubsButtonVisible) {
      console.log('❌ Clubs button not found, checking all nav buttons...');
      const navButtons = await page.locator('[data-testid="bottom-navigation"] button').all();
      console.log('📊 Found', navButtons.length, 'navigation buttons');
      
      for (let i = 0; i < navButtons.length; i++) {
        const buttonText = await navButtons[i].textContent();
        console.log(`🔘 Button ${i + 1}:`, buttonText);
      }
      
      await page.screenshot({ path: 'debug-no-clubs-button.png', fullPage: true });
      throw new Error('Clubs button not found in bottom navigation');
    }
    
    console.log('👆 Clicking Clubs button...');
    await clubsButton.click();
    
    console.log('⏳ Waiting 3 seconds for clubs page to load...');
    await page.waitForTimeout(3000);
    
    console.log('📍 Current URL after clicking Clubs:', page.url());
    
    console.log('🔍 Looking for Clubs header...');
    const clubsHeader = await page.locator('header h1:has-text("Clubs")');
    const clubsHeaderVisible = await clubsHeader.isVisible();
    console.log('👀 Clubs header visible:', clubsHeaderVisible);
    
    if (!clubsHeaderVisible) {
      console.log('❌ Clubs header not found, taking screenshot...');
      await page.screenshot({ path: 'debug-no-clubs-header.png', fullPage: true });
      
      // Check what headers are available
      const headers = await page.locator('header h1').all();
      console.log('📊 Found', headers.length, 'headers');
      for (let i = 0; i < headers.length; i++) {
        const headerText = await headers[i].textContent();
        console.log(`📄 Header ${i + 1}:`, headerText);
      }
      
      throw new Error('Clubs header not found');
    }
    
    console.log('🔍 Looking for club tabs...');
    const discoverTab = await page.locator('[role="tab"]:has-text("Discover")');
    const myClubsTab = await page.locator('[role="tab"]:has-text("My Clubs")');
    const trendingTab = await page.locator('[role="tab"]:has-text("Trending")');
    
    console.log('👀 Discover tab visible:', await discoverTab.isVisible());
    console.log('👀 My Clubs tab visible:', await myClubsTab.isVisible());
    console.log('👀 Trending tab visible:', await trendingTab.isVisible());
    
    console.log('🔍 Looking for category buttons...');
    const categoryAll = await page.locator('[data-testid="category-all"]');
    const categorySports = await page.locator('[data-testid="category-sports"]');
    
    console.log('👀 Category All visible:', await categoryAll.isVisible());
    console.log('👀 Category Sports visible:', await categorySports.isVisible());
    
    console.log('🔍 Looking for club cards...');
    const clubCards = await page.locator('[data-testid="club-card"]');
    const clubCardCount = await clubCards.count();
    console.log('📊 Found', clubCardCount, 'club cards');
    
    if (clubCardCount === 0) {
      console.log('⚠️ No club cards found, checking for loading or error states...');
      
      const loadingElement = await page.locator('[data-testid="clubs-loading"]');
      const emptyElement = await page.locator('[data-testid="clubs-empty"]');
      
      console.log('👀 Loading visible:', await loadingElement.isVisible());
      console.log('👀 Empty state visible:', await emptyElement.isVisible());
      
      // Check what's actually in the clubs list container
      const clubsList = await page.locator('[data-testid="clubs-list"]');
      const clubsListContent = await clubsList.textContent();
      console.log('📄 Clubs list content:', clubsListContent?.substring(0, 200));
    }
    
    console.log('✅ Clubs timeout debug completed successfully!');
    await page.screenshot({ path: 'debug-clubs-success.png', fullPage: true });
    
  } catch (error) {
    console.error('❌ Error during debug:', error.message);
    await page.screenshot({ path: 'debug-clubs-error.png', fullPage: true });
  } finally {
    await browser.close();
  }
}

debugClubsTimeout().catch(console.error);
