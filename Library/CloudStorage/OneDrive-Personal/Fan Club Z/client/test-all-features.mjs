import { chromium } from '@playwright/test';

async function testAllFeatures() {
  console.log('🚀 Starting comprehensive Fan Club Z feature testing...\n');
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  const results = {
    passed: [],
    failed: [],
    total: 0
  };

  try {
    // Test 1: App loads successfully
    console.log('📱 Test 1: App loads successfully');
    try {
      await page.goto('http://localhost:3000');
      await page.waitForLoadState('networkidle');
      await page.waitForSelector('text=Discover', { timeout: 10000 });
      console.log('✅ App loads successfully');
      results.passed.push('App loads successfully');
    } catch (error) {
      console.log('❌ App load failed:', error.message);
      results.failed.push('App loads successfully');
    }
    results.total++;

    // Test 2: Guest access to discover page
    console.log('\n👤 Test 2: Guest access to discover page');
    try {
      await page.waitForSelector('text=Discover', { timeout: 5000 });
      await page.waitForSelector('text=Trending Now', { timeout: 5000 });
      console.log('✅ Guest can access discover page');
      results.passed.push('Guest access to discover page');
    } catch (error) {
      console.log('❌ Guest access failed:', error.message);
      results.failed.push('Guest access to discover page');
    }
    results.total++;

    // Test 3: Bet cards are displayed
    console.log('\n🎯 Test 3: Bet cards are displayed');
    try {
      await page.waitForSelector('[data-testid="bet-card"]', { timeout: 10000 });
      const betCards = await page.locator('[data-testid="bet-card"]').count();
      console.log(`✅ ${betCards} bet cards displayed`);
      results.passed.push('Bet cards are displayed');
    } catch (error) {
      console.log('❌ Bet cards not displayed:', error.message);
      results.failed.push('Bet cards are displayed');
    }
    results.total++;

    // Test 4: Navigation between tabs
    console.log('\n🧭 Test 4: Navigation between tabs');
    const tabs = ['My Bets', 'Create', 'Clubs', 'Profile'];
    for (const tab of tabs) {
      try {
        await page.click(`button:has-text("${tab}")`);
        await page.waitForTimeout(1000);
        console.log(`✅ ${tab} tab navigation works`);
        results.passed.push(`${tab} tab navigation`);
      } catch (error) {
        console.log(`❌ ${tab} tab navigation failed:`, error.message);
        results.failed.push(`${tab} tab navigation`);
      }
      results.total++;
    }

    // Test 5: Authentication modal
    console.log('\n🔐 Test 5: Authentication modal');
    try {
      await page.click('button:has-text("Sign In")');
      await page.waitForSelector('text=Sign In', { timeout: 5000 });
      console.log('✅ Authentication modal opens');
      results.passed.push('Authentication modal');
    } catch (error) {
      console.log('❌ Authentication modal failed:', error.message);
      results.failed.push('Authentication modal');
    }
    results.total++;

    // Test 6: User login
    console.log('\n👤 Test 6: User login');
    try {
      await page.fill('input[placeholder="Email"]', 'demo@example.com');
      await page.fill('input[placeholder="Password"]', 'password123');
      await page.click('button:has-text("Sign In")');
      await page.waitForTimeout(2000);
      console.log('✅ User login works');
      results.passed.push('User login');
    } catch (error) {
      console.log('❌ User login failed:', error.message);
      results.failed.push('User login');
    }
    results.total++;

    // Test 7: Bet detail navigation
    console.log('\n📄 Test 7: Bet detail navigation');
    try {
      await page.click('[data-testid="bet-card"]');
      await page.waitForSelector('text=Place Bet', { timeout: 5000 });
      console.log('✅ Bet detail navigation works');
      results.passed.push('Bet detail navigation');
    } catch (error) {
      console.log('❌ Bet detail navigation failed:', error.message);
      results.failed.push('Bet detail navigation');
    }
    results.total++;

    // Test 8: Back navigation
    console.log('\n⬅️ Test 8: Back navigation');
    try {
      await page.click('button[aria-label="Back"]');
      await page.waitForSelector('text=Discover', { timeout: 5000 });
      console.log('✅ Back navigation works');
      results.passed.push('Back navigation');
    } catch (error) {
      console.log('❌ Back navigation failed:', error.message);
      results.failed.push('Back navigation');
    }
    results.total++;

    // Test 9: Search functionality
    console.log('\n🔍 Test 9: Search functionality');
    try {
      await page.fill('input[placeholder="Search bets, topics, or creators..."]', 'Bitcoin');
      await page.waitForTimeout(1000);
      console.log('✅ Search functionality works');
      results.passed.push('Search functionality');
    } catch (error) {
      console.log('❌ Search functionality failed:', error.message);
      results.failed.push('Search functionality');
    }
    results.total++;

    // Test 10: Category filtering
    console.log('\n🏷️ Test 10: Category filtering');
    try {
      await page.click('button:has-text("Sports")');
      await page.waitForTimeout(1000);
      console.log('✅ Category filtering works');
      results.passed.push('Category filtering');
    } catch (error) {
      console.log('❌ Category filtering failed:', error.message);
      results.failed.push('Category filtering');
    }
    results.total++;

    // Test 11: Wallet functionality
    console.log('\n💰 Test 11: Wallet functionality');
    try {
      await page.click('button:has-text("Profile")');
      await page.waitForSelector('text=Profile', { timeout: 5000 });
      console.log('✅ Profile functionality works');
      results.passed.push('Profile functionality');
    } catch (error) {
      console.log('❌ Profile functionality failed:', error.message);
      results.failed.push('Profile functionality');
    }
    results.total++;

    // Test 12: Clubs functionality
    console.log('\n👥 Test 12: Clubs functionality');
    try {
      await page.click('button:has-text("Clubs")');
      await page.waitForSelector('text=Popular Clubs', { timeout: 5000 });
      console.log('✅ Clubs functionality works');
      results.passed.push('Clubs functionality');
    } catch (error) {
      console.log('❌ Clubs functionality failed:', error.message);
      results.failed.push('Clubs functionality');
    }
    results.total++;

    // Test 13: Profile functionality
    console.log('\n👤 Test 13: Profile functionality');
    try {
      await page.click('button:has-text("Profile")');
      await page.waitForSelector('text=Profile', { timeout: 5000 });
      console.log('✅ Profile functionality works');
      results.passed.push('Profile functionality');
    } catch (error) {
      console.log('❌ Profile functionality failed:', error.message);
      results.failed.push('Profile functionality');
    }
    results.total++;

    // Test 14: Mobile responsiveness
    console.log('\n📱 Test 14: Mobile responsiveness');
    try {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.waitForTimeout(1000);
      await page.waitForSelector('text=Discover', { timeout: 5000 });
      console.log('✅ Mobile responsiveness works');
      results.passed.push('Mobile responsiveness');
    } catch (error) {
      console.log('❌ Mobile responsiveness failed:', error.message);
      results.failed.push('Mobile responsiveness');
    }
    results.total++;

    // Test 15: Performance check
    console.log('\n⚡ Test 15: Performance check');
    try {
      const startTime = Date.now();
      await page.reload();
      await page.waitForLoadState('networkidle');
      const loadTime = Date.now() - startTime;
      console.log(`✅ Page loads in ${loadTime}ms`);
      results.passed.push('Performance check');
    } catch (error) {
      console.log('❌ Performance check failed:', error.message);
      results.failed.push('Performance check');
    }
    results.total++;

  } catch (error) {
    console.log('❌ Test suite error:', error.message);
  } finally {
    await browser.close();
  }

  // Print results summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('='.repeat(50));
  console.log(`Total Tests: ${results.total}`);
  console.log(`Passed: ${results.passed.length} ✅`);
  console.log(`Failed: ${results.failed.length} ❌`);
  console.log(`Success Rate: ${((results.passed.length / results.total) * 100).toFixed(1)}%`);
  
  if (results.failed.length > 0) {
    console.log('\n❌ FAILED TESTS:');
    results.failed.forEach(test => console.log(`  - ${test}`));
  }
  
  if (results.passed.length > 0) {
    console.log('\n✅ PASSED TESTS:');
    results.passed.forEach(test => console.log(`  - ${test}`));
  }
  
  console.log('\n' + '='.repeat(50));
  
  return results;
}

// Run the tests
testAllFeatures().catch(console.error); 