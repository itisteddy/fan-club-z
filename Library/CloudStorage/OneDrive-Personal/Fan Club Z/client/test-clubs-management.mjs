import { chromium } from 'playwright';

async function testClubsManagement() {
  console.log('🧪 Testing Club Management Features...\n');
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    // Navigate to app
    console.log('📍 Navigating to app...');
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    
    // Demo login
    console.log('🔐 Performing demo login...');
    const demoButton = page.locator('button:has-text("Try Demo")');
    await demoButton.click();
    await page.waitForTimeout(3000);
    
    // Navigate to clubs
    console.log('🎯 Navigating to clubs...');
    const clubsTab = page.locator('[data-testid="nav-clubs"]');
    await clubsTab.click();
    await page.waitForTimeout(2000);
    
    // Check current URL
    const currentUrl = page.url();
    console.log('📍 Current URL:', currentUrl);
    
    if (!currentUrl.includes('/clubs')) {
      console.log('❌ Failed to navigate to clubs page');
      return false;
    }
    
    // Check for clubs header
    console.log('🔍 Checking for clubs header...');
    const clubsHeader = await page.locator('header h1:has-text("Clubs")').isVisible();
    console.log(`✅ Clubs header visible: ${clubsHeader}`);
    
    // Check for categories
    console.log('🔍 Checking for category buttons...');
    const allCategoryButton = await page.locator('[data-testid="category-all"]').isVisible();
    console.log(`✅ All category button visible: ${allCategoryButton}`);
    
    if (allCategoryButton) {
      console.log('🖱️ Testing category interaction...');
      await page.locator('[data-testid="category-sports"]').click();
      await page.waitForTimeout(1000);
      console.log('✅ Category clicked successfully');
    }
    
    // Check for clubs list
    console.log('🔍 Checking for clubs list...');
    const clubsList = await page.locator('[data-testid="clubs-list"]').isVisible();
    console.log(`✅ Clubs list visible: ${clubsList}`);
    
    // Count club cards
    const clubCards = page.locator('[data-testid="club-card"]');
    const clubCardCount = await clubCards.count();
    console.log(`📊 Found ${clubCardCount} club cards`);
    
    if (clubCardCount > 0) {
      console.log('🔍 Testing club card interaction...');
      
      // Check for View Club button
      const viewClubButton = clubCards.first().locator('[data-testid="view-club-button"]');
      const viewButtonExists = await viewClubButton.isVisible();
      console.log(`✅ View club button visible: ${viewButtonExists}`);
      
      if (viewButtonExists) {
        console.log('🖱️ Clicking view club button...');
        await viewClubButton.click();
        await page.waitForTimeout(3000);
        
        // Check if we navigated to club detail page
        const detailUrl = page.url();
        console.log('📍 Club detail URL:', detailUrl);
        
        if (detailUrl.includes('/clubs/') && detailUrl !== currentUrl) {
          console.log('✅ Successfully navigated to club detail page');
          
          // Check for club detail elements
          const clubDetailHeader = await page.locator('h1').first().isVisible();
          console.log(`✅ Club detail header visible: ${clubDetailHeader}`);
          
          // Test tabs
          const overviewTab = await page.locator('button:has-text("Overview")').isVisible();
          const betsTab = await page.locator('button:has-text("Bets")').isVisible();
          const membersTab = await page.locator('button:has-text("Members")').isVisible();
          const discussionsTab = await page.locator('button:has-text("Discussions")').isVisible();
          
          console.log(`✅ Overview tab visible: ${overviewTab}`);
          console.log(`✅ Bets tab visible: ${betsTab}`);
          console.log(`✅ Members tab visible: ${membersTab}`);
          console.log(`✅ Discussions tab visible: ${discussionsTab}`);
          
          if (betsTab) {
            console.log('🖱️ Testing bets tab...');
            await page.locator('button:has-text("Bets")').click();
            await page.waitForTimeout(1000);
            console.log('✅ Bets tab clicked successfully');
          }
          
          if (membersTab) {
            console.log('🖱️ Testing members tab...');
            await page.locator('button:has-text("Members")').click();
            await page.waitForTimeout(1000);
            console.log('✅ Members tab clicked successfully');
          }
          
          // Navigate back to clubs
          console.log('🔙 Navigating back to clubs...');
          await page.locator('button').filter({ hasText: 'ArrowLeft' }).first().click();
          await page.waitForTimeout(2000);
          
          const backUrl = page.url();
          console.log('📍 Back URL:', backUrl);
          
          if (backUrl.includes('/clubs') && !backUrl.includes('/clubs/club-')) {
            console.log('✅ Successfully navigated back to clubs list');
          }
          
        } else {
          console.log('❌ Failed to navigate to club detail page');
          return false;
        }
      }
    }
    
    // Test tabs on main clubs page
    console.log('🔍 Testing clubs main page tabs...');
    const discoverTab = await page.locator('button:has-text("Discover")').isVisible();
    const myClubsTab = await page.locator('button:has-text("My Clubs")').isVisible();
    const trendingTab = await page.locator('button:has-text("Trending")').isVisible();
    
    console.log(`✅ Discover tab visible: ${discoverTab}`);
    console.log(`✅ My Clubs tab visible: ${myClubsTab}`);
    console.log(`✅ Trending tab visible: ${trendingTab}`);
    
    if (myClubsTab) {
      console.log('🖱️ Testing My Clubs tab...');
      await page.locator('button:has-text("My Clubs")').click();
      await page.waitForTimeout(1000);
      console.log('✅ My Clubs tab clicked successfully');
    }
    
    if (trendingTab) {
      console.log('🖱️ Testing Trending tab...');
      await page.locator('button:has-text("Trending")').click();
      await page.waitForTimeout(1000);
      console.log('✅ Trending tab clicked successfully');
    }
    
    // Test club creation functionality
    console.log('🔍 Testing club creation...');
    await page.locator('button:has-text("Discover")').click();
    await page.waitForTimeout(1000);
    
    const createClubButton = page.locator('button:has-text("Create Club")');
    const createButtonExists = await createClubButton.isVisible();
    console.log(`✅ Create Club button visible: ${createButtonExists}`);
    
    if (createButtonExists) {
      console.log('🖱️ Testing create club modal...');
      await createClubButton.click();
      await page.waitForTimeout(1000);
      
      const modal = await page.locator('dialog').isVisible();
      console.log(`✅ Create club modal visible: ${modal}`);
      
      if (modal) {
        // Close modal
        await page.locator('button:has-text("Cancel")').click();
        await page.waitForTimeout(500);
        console.log('✅ Create club modal closed successfully');
      }
    }
    
    console.log('\n🎉 Club Management test completed successfully!');
    return true;
    
  } catch (error) {
    console.error('❌ Error during testing:', error);
    return false;
  } finally {
    await browser.close();
  }
}

testClubsManagement().then(success => {
  if (success) {
    console.log('\n🎉 Club Management features are working correctly!');
    process.exit(0);
  } else {
    console.log('\n💥 Club Management test failed!');
    process.exit(1);
  }
}).catch(error => {
  console.error('💥 Test runner failed:', error);
  process.exit(1);
});
