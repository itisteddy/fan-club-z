import { chromium } from 'playwright';

async function testClubCategories() {
  console.log('🧪 Testing Club Categories Feature...\n');
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    // Navigate and login
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    
    // Demo login
    const demoButton = page.locator('button:has-text("Try Demo")');
    await demoButton.click();
    await page.waitForTimeout(3000);
    
    // Navigate to clubs
    const clubsTab = page.locator('[data-testid="nav-clubs"]');
    await clubsTab.click();
    await page.waitForTimeout(2000);
    
    // Check that we're on the clubs page
    const clubsHeader = await page.locator('header h1:has-text("Clubs")').isVisible();
    console.log('✅ Clubs header visible:', clubsHeader);
    
    // Ensure we're on the Discover tab
    const discoverTab = page.locator('[role="tab"]:has-text("Discover")');
    if (await discoverTab.isVisible()) {
      await discoverTab.click();
      await page.waitForTimeout(1000);
    }
    
    // Check category filters using our data-testid attributes
    const allCategory = await page.locator('[data-testid="category-all"]').isVisible();
    const sportsCategory = await page.locator('[data-testid="category-sports"]').isVisible();
    const cryptoCategory = await page.locator('[data-testid="category-crypto"]').isVisible();
    const entertainmentCategory = await page.locator('[data-testid="category-entertainment"]').isVisible();
    
    console.log('📋 Category Buttons:');
    console.log('  - All:', allCategory);
    console.log('  - Sports:', sportsCategory);
    console.log('  - Crypto:', cryptoCategory);
    console.log('  - Entertainment:', entertainmentCategory);
    
    if (sportsCategory) {
      // Test category interaction
      console.log('🖱️ Testing category interaction...');
      await page.locator('[data-testid="category-sports"]').click();
      await page.waitForTimeout(1000);
      
      const sportsSelected = await page.locator('[data-testid="category-sports"]').evaluate(el => 
        el.className.includes('bg-blue-500')
      );
      console.log('✅ Sports category selected:', sportsSelected);
      
      // Switch back to All
      await page.locator('[data-testid="category-all"]').click();
      await page.waitForTimeout(1000);
      
      const allSelected = await page.locator('[data-testid="category-all"]').evaluate(el => 
        el.className.includes('bg-blue-500')
      );
      console.log('✅ All category selected:', allSelected);
    }
    
    const allTestsPassed = clubsHeader && allCategory && sportsCategory && cryptoCategory && entertainmentCategory;
    
    if (allTestsPassed) {
      console.log('\n🎉 Club Categories test PASSED!');
      return true;
    } else {
      console.log('\n❌ Club Categories test FAILED!');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Error during testing:', error);
    return false;
  } finally {
    await browser.close();
  }
}

testClubCategories().then(success => {
  if (success) {
    console.log('\n✅ Club Categories feature is working correctly!');
    process.exit(0);
  } else {
    console.log('\n💥 Club Categories feature needs attention!');
    process.exit(1);
  }
}).catch(error => {
  console.error('💥 Test runner failed:', error);
  process.exit(1);
});
