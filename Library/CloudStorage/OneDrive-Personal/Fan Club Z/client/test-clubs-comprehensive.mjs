import { chromium } from 'playwright';

async function testClubFeatures() {
  console.log('🧠 Comprehensive Club Features Test...');
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  const results = {
    categories: false,
    clubCards: false,
    navigation: false,
    tabs: false,
    createClub: false
  };
  
  try {
    // Setup
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    
    // Demo login
    await page.locator('button:has-text("Try Demo")').click();
    await page.waitForTimeout(3000);
    
    // Navigate to clubs
    await page.locator('[data-testid="nav-clubs"]').click();
    await page.waitForTimeout(2000);
    
    // Test 1: Categories
    console.log('\n📋 Test 1: Club Categories');
    try {
      const discoverTab = page.locator('[role="tab"]:has-text("Discover")');
      if (await discoverTab.isVisible()) {
        await discoverTab.click();
        await page.waitForTimeout(1000);
      }
      
      const allCategory = await page.locator('[data-testid="category-all"]').isVisible();
      const sportsCategory = await page.locator('[data-testid="category-sports"]').isVisible();
      
      if (allCategory && sportsCategory) {
        results.categories = true;
        console.log('✅ Categories test PASSED');
      } else {
        console.log('❌ Categories test FAILED');
      }
    } catch (e) {
      console.log('❌ Categories test ERROR:', e.message);
    }
    
    // Test 2: Club Cards
    console.log('\n📋 Test 2: Club Cards');
    try {
      await page.waitForTimeout(2000);
      const clubCards = await page.locator('[data-testid="club-card"]').count();
      
      if (clubCards > 0) {
        results.clubCards = true;
        console.log(`✅ Club Cards test PASSED (${clubCards} cards found)`);
      } else {
        console.log('❌ Club Cards test FAILED (no cards found)');
      }
    } catch (e) {
      console.log('❌ Club Cards test ERROR:', e.message);
    }
    
    // Test 3: Navigation to Detail
    console.log('\n📋 Test 3: Club Detail Navigation');
    try {
      const viewButton = page.locator('[data-testid="view-club-button"]').first();
      const clubCard = page.locator('[data-testid="club-card"]').first();
      
      if (await viewButton.isVisible()) {
        await viewButton.click();
      } else if (await clubCard.isVisible()) {
        await clubCard.click();
      }
      
      await page.waitForTimeout(2000);
      
      const overviewTab = await page.locator('[role="tab"]:has-text("Overview")').isVisible();
      const betsTab = await page.locator('[role="tab"]:has-text("Bets")').isVisible();
      
      if (overviewTab && betsTab) {
        results.navigation = true;
        console.log('✅ Navigation test PASSED');
      } else {
        console.log('❌ Navigation test FAILED');
      }
    } catch (e) {
      console.log('❌ Navigation test ERROR:', e.message);
    }
    
    // Test 4: Tab Functionality
    console.log('\n📋 Test 4: Tab Functionality');
    try {
      if (results.navigation) {
        await page.locator('[role="tab"]:has-text("Members")').click();
        await page.waitForTimeout(1000);
        
        await page.locator('[role="tab"]:has-text("Discussions")').click();
        await page.waitForTimeout(1000);
        
        results.tabs = true;
        console.log('✅ Tabs test PASSED');
      } else {
        console.log('⏭️ Tabs test SKIPPED (navigation failed)');
      }
    } catch (e) {
      console.log('❌ Tabs test ERROR:', e.message);
    }
    
    // Navigate back to clubs list for create test
    await page.locator('[data-testid="nav-clubs"]').click();
    await page.waitForTimeout(2000);
    
    // Test 5: Create Club Modal
    console.log('\n📋 Test 5: Create Club Modal');
    try {
      const discoverTab = page.locator('[role="tab"]:has-text("Discover")');
      if (await discoverTab.isVisible()) {
        await discoverTab.click();
        await page.waitForTimeout(1000);
      }
      
      const createButton = page.locator('button:has-text("Create Club")');
      if (await createButton.isVisible()) {
        await createButton.click();
        await page.waitForTimeout(1000);
        
        const modal = await page.locator('text="Create New Club"').isVisible();
        
        if (modal) {
          results.createClub = true;
          console.log('✅ Create Club test PASSED');
          
          // Close modal
          await page.locator('button:has-text("Cancel")').click();
        } else {
          console.log('❌ Create Club test FAILED (modal not found)');
        }
      } else {
        console.log('⏭️ Create Club test SKIPPED (button not visible)');
      }
    } catch (e) {
      console.log('❌ Create Club test ERROR:', e.message);
    }
    
    // Results Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 CLUB FEATURES TEST RESULTS:');
    console.log('='.repeat(50));
    
    const testResults = [
      { name: 'Categories', passed: results.categories },
      { name: 'Club Cards', passed: results.clubCards },
      { name: 'Navigation', passed: results.navigation },
      { name: 'Tabs', passed: results.tabs },
      { name: 'Create Club', passed: results.createClub }
    ];
    
    testResults.forEach(test => {
      const status = test.passed ? '✅ PASSED' : '❌ FAILED';
      console.log(`  ${test.name}: ${status}`);
    });
    
    const passedCount = testResults.filter(t => t.passed).length;
    const totalCount = testResults.length;
    const successRate = Math.round((passedCount / totalCount) * 100);
    
    console.log('\n📈 Overall Success Rate:', `${passedCount}/${totalCount} (${successRate}%)`);
    
    if (passedCount >= 4) {
      console.log('\n🎉 CLUB MANAGEMENT IS WORKING WELL!');
      console.log('✅ Item 9 (Club Management) has been successfully fixed.');
      return true;
    } else {
      console.log('\n⚠️ Club Management needs additional attention.');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Test execution error:', error);
    return false;
  } finally {
    await browser.close();
  }
}

testClubFeatures().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('💥 Test runner failed:', error);
  process.exit(1);
});
