import { chromium } from '@playwright/test';

async function testSearchFunctionality() {
  console.log('🔍 Testing Search Functionality...\n');
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  const results = {
    passed: [],
    failed: [],
    total: 0
  };

  try {
    // Navigate to the app
    console.log('📱 Navigating to app...');
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');

    // Login with demo
    console.log('🔐 Logging in with demo...');
    await page.locator('button:has-text("Try Demo")').click();
    await page.waitForLoadState('networkidle');
    
    // Wait for bottom navigation to be visible
    await page.waitForSelector('[data-testid="bottom-navigation"]', { timeout: 10000 });
    console.log('✅ Demo login successful');

    // Ensure we're on Discover page
    console.log('🧭 Navigating to Discover page...');
    await page.locator('[data-testid="bottom-navigation"] >> text=Discover').click();
    await page.waitForTimeout(1000);

    // Test 1: Search input should be visible and functional
    console.log('\n🔍 Test 1: Search input visibility and functionality');
    results.total++;
    try {
      const searchInput = page.locator('input[placeholder="Search bets..."]');
      await searchInput.waitFor({ timeout: 5000 });
      console.log('✅ Search input found with correct placeholder');
      
      // Test typing in search
      await searchInput.fill('Bitcoin');
      console.log('✅ Can type in search input');
      
      results.passed.push('Search input visibility and functionality');
    } catch (error) {
      console.log('❌ Search input test failed:', error.message);
      results.failed.push('Search input visibility and functionality');
    }

    // Test 2: Search should filter results
    console.log('\n🔍 Test 2: Search should filter results');
    results.total++;
    try {
      // Wait for debounce to complete
      await page.waitForTimeout(500);
      
      // Check if search results are showing
      const searchResultsHeader = page.locator('text=Search Results');
      await searchResultsHeader.waitFor({ timeout: 3000 });
      console.log('✅ Search Results header visible');
      
      // Check if search query is displayed
      const searchQuery = page.locator('text=Showing results for: "Bitcoin"');
      await searchQuery.waitFor({ timeout: 3000 });
      console.log('✅ Search query display visible');
      
      results.passed.push('Search should filter results');
    } catch (error) {
      console.log('❌ Search filtering failed:', error.message);
      results.failed.push('Search should filter results');
    }

    // Test 3: Search should show appropriate results
    console.log('\n🔍 Test 3: Search should show appropriate results');
    results.total++;
    try {
      // Check if Bitcoin bet is visible
      const bitcoinBet = page.locator('text=Will Bitcoin reach $100K');
      await bitcoinBet.waitFor({ timeout: 3000 });
      console.log('✅ Bitcoin bet visible in search results');
      
      // Check if non-matching bets are hidden
      const taylorSwiftBet = page.locator('text=Taylor Swift');
      const isHidden = !(await taylorSwiftBet.isVisible());
      if (isHidden) {
        console.log('✅ Non-matching bets are hidden');
      } else {
        throw new Error('Non-matching bets are still visible');
      }
      
      results.passed.push('Search should show appropriate results');
    } catch (error) {
      console.log('❌ Search results filtering failed:', error.message);
      results.failed.push('Search should show appropriate results');
    }

    // Test 4: Clear search should work
    console.log('\n🔍 Test 4: Clear search functionality');
    results.total++;
    try {
      // Clear the search
      const searchInput = page.locator('input[placeholder="Search bets..."]');
      await searchInput.clear();
      console.log('✅ Search input cleared');
      
      // Wait for debounce
      await page.waitForTimeout(500);
      
      // Check if we're back to "Trending Now"
      const trendingHeader = page.locator('text=Trending Now');
      await trendingHeader.waitFor({ timeout: 3000 });
      console.log('✅ Back to Trending Now after clearing search');
      
      // Check if all bets are visible again
      const betCards = page.locator('[data-testid="bet-card"]');
      const count = await betCards.count();
      if (count === 3) {
        console.log('✅ All bet cards visible after clearing search');
      } else {
        throw new Error(`Expected 3 bet cards, got ${count}`);
      }
      
      results.passed.push('Clear search functionality');
    } catch (error) {
      console.log('❌ Clear search failed:', error.message);
      results.failed.push('Clear search functionality');
    }

    // Test 5: Search with no results
    console.log('\n🔍 Test 5: Search with no results');
    results.total++;
    try {
      const searchInput = page.locator('input[placeholder="Search bets..."]');
      await searchInput.fill('nonexistent');
      
      // Wait for debounce
      await page.waitForTimeout(500);
      
      // Check for no results message
      const noResults = page.locator('text=No Results Found');
      await noResults.waitFor({ timeout: 3000 });
      console.log('✅ No results message displayed');
      
      // Check for clear search button
      const clearButton = page.locator('button:has-text("Clear Search")');
      await clearButton.waitFor({ timeout: 3000 });
      console.log('✅ Clear search button available');
      
      // Click clear search
      await clearButton.click();
      
      // Wait for page to reset
      await page.waitForTimeout(500);
      
      // Check if back to normal
      const trendingHeader = page.locator('text=Trending Now');
      await trendingHeader.waitFor({ timeout: 3000 });
      console.log('✅ Clear search button works');
      
      results.passed.push('Search with no results');
    } catch (error) {
      console.log('❌ No results search test failed:', error.message);
      results.failed.push('Search with no results');
    }

    // Test 6: Test search with different categories
    console.log('\n🔍 Test 6: Search with category filtering');
    results.total++;
    try {
      // Select Sports category
      const sportsCategory = page.locator('[data-testid="category-button"]:has-text("Sports")');
      await sportsCategory.click();
      console.log('✅ Sports category selected');
      
      // Search for something that exists in sports
      const searchInput = page.locator('input[placeholder="Search bets..."]');
      await searchInput.fill('Arsenal');
      
      // Wait for debounce
      await page.waitForTimeout(500);
      
      // Should find the Premier League bet
      const arsenalBet = page.locator('text=Premier League: Man City vs Arsenal');
      await arsenalBet.waitFor({ timeout: 3000 });
      console.log('✅ Category + search filtering works');
      
      results.passed.push('Search with category filtering');
    } catch (error) {
      console.log('❌ Category + search filtering failed:', error.message);
      results.failed.push('Search with category filtering');
    }

  } catch (error) {
    console.log('❌ Test suite error:', error.message);
  } finally {
    await browser.close();
  }

  // Print results summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 SEARCH FUNCTIONALITY TEST RESULTS');
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

// Run the test
testSearchFunctionality().catch(console.error);
