import { chromium } from 'playwright';

// Helper function for assertions
const expect = {
  toBeVisible: async (locator) => {
    const isVisible = await locator.isVisible();
    if (!isVisible) {
      throw new Error(`Element not visible: ${await locator.toString()}`);
    }
  },
  not: {
    toBeVisible: async (locator) => {
      const isVisible = await locator.isVisible();
      if (isVisible) {
        throw new Error(`Element should not be visible: ${await locator.toString()}`);
      }
    }
  }
};

const testNewNavigation = async () => {
  console.log('🚀 Testing New 4-Tab Navigation System...\n');
  
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
    
    // Wait for the app to fully load
    await page.waitForTimeout(2000);
    
    // Check if we're on the login page and need to authenticate
    const isLoginPage = await page.locator('text=Welcome to Fan Club Z').count() > 0;
    
    if (isLoginPage) {
      console.log('🔐 Login page detected, authenticating with demo account...');
      
      // Click the demo login button
      await page.locator('[data-testid="demo-login-button"]').click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
      
      console.log('✅ Demo authentication completed');
    }
    
    // Test 1: Verify 4-tab navigation structure
    console.log('\n✅ Test 1: Verifying 4-tab navigation structure...');
    
    // Wait for bottom navigation to appear
    await page.waitForSelector('[data-testid="bottom-navigation"]', { timeout: 10000 });
    
    const tabs = await page.locator('[data-testid^="nav-"]').all();
    console.log(`Found ${tabs.length} tabs in navigation`);
    
    if (tabs.length !== 4) {
      throw new Error(`Expected 4 tabs, found ${tabs.length}`);
    }
    
    // Verify tab labels (Profile might show user initial)
    const tabLabels = await page.locator('[data-testid^="nav-"] span').allTextContents();
    console.log('Tab labels:', tabLabels);
    
    const expectedLabels = ['Discover', 'My Bets', 'Clubs'];
    for (const expected of expectedLabels) {
      if (!tabLabels.includes(expected)) {
        throw new Error(`Missing expected tab: ${expected}`);
      }
    }
    
    // Check for Profile tab (might show user initial)
    const hasProfileTab = tabLabels.some(label => label === 'Profile' || label.length === 1);
    if (!hasProfileTab) {
      throw new Error('Missing Profile tab');
    }
    
    // Test 2: Verify Discover tab (default)
    console.log('\n✅ Test 2: Testing Discover tab...');
    
    // Check for large title
    const discoverTitle = await page.locator('h1:has-text("Discover")').first();
    await expect.toBeVisible(discoverTitle);
    
    // Check for search bar
    const searchInput = await page.locator('input[placeholder="Search"]');
    await expect.toBeVisible(searchInput);
    
    // Check for bet cards
    const betCards = await page.locator('[data-testid="bet-card"]').all();
    console.log(`Found ${betCards.length} bet cards on Discover tab`);
    
    // Check for Floating Action Button
    const fab = await page.locator('[data-testid="floating-action-button"]');
    await expect.toBeVisible(fab);
    console.log('✅ Floating Action Button found on Discover tab');
    
    // Test 3: Test My Bets tab
    console.log('\n✅ Test 3: Testing My Bets tab...');
    
    await page.locator('[data-testid="nav-my-bets"]').click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    // Check for My Bets title
    const myBetsTitle = await page.locator('h1:has-text("My Bets")');
    await expect.toBeVisible(myBetsTitle);
    
    // Check for FAB on My Bets tab
    const fabMyBets = await page.locator('[data-testid="floating-action-button"]');
    await expect.toBeVisible(fabMyBets);
    console.log('✅ Floating Action Button found on My Bets tab');
    
    // Test 4: Test Clubs tab
    console.log('\n✅ Test 4: Testing Clubs tab...');
    
    await page.locator('[data-testid="nav-clubs"]').click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    // Check for Clubs title
    const clubsTitle = await page.locator('h1:has-text("Clubs")');
    await expect.toBeVisible(clubsTitle);
    
    // Check for club cards
    const clubCards = await page.locator('[data-testid="club-card"]').all();
    console.log(`Found ${clubCards.length} club cards`);
    
    // Verify NO FAB on Clubs tab
    const fabClubs = await page.locator('[data-testid="floating-action-button"]');
    await expect.not.toBeVisible(fabClubs);
    console.log('✅ No Floating Action Button on Clubs tab (correct)');
    
    // Test 5: Test Profile tab
    console.log('\n✅ Test 5: Testing Profile tab...');
    
    await page.locator('[data-testid="nav-profile"]').click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    // Check for Profile title
    const profileTitle = await page.locator('h1:has-text("Profile")');
    await expect.toBeVisible(profileTitle);
    
    // Check for wallet balance in profile header
    const walletBalance = await page.locator('[data-testid="wallet-balance"]');
    await expect.toBeVisible(walletBalance);
    console.log('✅ Wallet balance found in Profile header');
    
    // Verify NO FAB on Profile tab
    const fabProfile = await page.locator('[data-testid="floating-action-button"]');
    await expect.not.toBeVisible(fabProfile);
    console.log('✅ No Floating Action Button on Profile tab (correct)');
    
    // Test 6: Test Floating Action Button functionality
    console.log('\n✅ Test 6: Testing Floating Action Button functionality...');
    
    // Go back to Discover tab
    await page.locator('[data-testid="nav-discover"]').click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    // Click the FAB
    await page.locator('[data-testid="floating-action-button"]').click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    // Should navigate to create bet page
    const createBetTitle = await page.locator('h1:has-text("Create Bet")');
    await expect.toBeVisible(createBetTitle);
    console.log('✅ FAB successfully navigated to Create Bet page');
    
    // Go back to Discover
    await page.goBack();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    // Test 7: Test FAB on My Bets tab
    console.log('\n✅ Test 7: Testing FAB on My Bets tab...');
    
    await page.locator('[data-testid="nav-my-bets"]').click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    // Click the FAB on My Bets tab
    await page.locator('[data-testid="floating-action-button"]').click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    // Should navigate to create bet page
    const createBetTitle2 = await page.locator('h1:has-text("Create Bet")');
    await expect.toBeVisible(createBetTitle2);
    console.log('✅ FAB on My Bets tab successfully navigated to Create Bet page');
    
    // Test 8: Verify mobile responsiveness
    console.log('\n✅ Test 8: Testing mobile responsiveness...');
    
    // Test different screen sizes
    const screenSizes = [
      { width: 375, height: 667, name: 'iPhone SE' },
      { width: 390, height: 844, name: 'iPhone 14' },
      { width: 428, height: 926, name: 'iPhone 14 Plus' }
    ];
    
    for (const size of screenSizes) {
      await page.setViewportSize(size);
      await page.waitForTimeout(500);
      
      // Verify navigation is still accessible
      const tabs = await page.locator('[data-testid^="nav-"]').all();
      if (tabs.length !== 4) {
        throw new Error(`Navigation broken on ${size.name}`);
      }
      
      // Verify FAB is still visible and accessible
      const fab = await page.locator('[data-testid="floating-action-button"]');
      await expect.toBeVisible(fab);
      
      console.log(`✅ Navigation works on ${size.name} (${size.width}x${size.height})`);
    }
    
    console.log('\n🎉 ALL TESTS PASSED! New navigation system is working perfectly!');
    console.log('\n📱 Mobile-optimized 4-tab navigation:');
    console.log('   • Discover tab with FAB ✅');
    console.log('   • My Bets tab with FAB ✅');
    console.log('   • Clubs tab (no FAB) ✅');
    console.log('   • Profile tab with wallet integration ✅');
    console.log('   • Floating Action Button working on both relevant tabs ✅');
    console.log('   • Mobile responsive across all screen sizes ✅');
    
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error('\n🔍 Debugging info:');
    
    // Take a screenshot for debugging
    await page.screenshot({ path: 'navigation-test-error.png', fullPage: true });
    console.log('📸 Screenshot saved as navigation-test-error.png');
    
    // Get page content for debugging
    const content = await page.content();
    console.log('\n📄 Page content preview:');
    console.log(content.substring(0, 500) + '...');
    
    throw error;
  } finally {
    await browser.close();
  }
};

// Run the test
testNewNavigation().catch(console.error); 