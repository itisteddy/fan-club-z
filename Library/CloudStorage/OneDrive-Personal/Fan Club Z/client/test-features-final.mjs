import { chromium } from '@playwright/test';

async function testFeature(name, testFn) {
  console.log(`\n🧪 Testing: ${name}`);
  try {
    await testFn();
    console.log(`✅ ${name} - PASSED`);
    return { name, passed: true };
  } catch (error) {
    console.log(`❌ ${name} - FAILED: ${error.message}`);
    return { name, passed: false, error: error.message };
  }
}

async function testAllFeatures() {
  console.log('🚀 Starting comprehensive Fan Club Z feature testing...\n');
  
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  const results = {
    passed: [],
    failed: [],
    total: 0
  };

  try {
    // Test 1: App loads successfully
    const test1 = await testFeature('App loads successfully', async () => {
      await page.goto('http://localhost:3000');
      await page.waitForLoadState('networkidle');
      await page.waitForSelector('text=Discover', { timeout: 10000 });
    });
    results.total++;
    if (test1.passed) results.passed.push(test1.name);
    else results.failed.push(test1.name);

    // Test 2: Guest access to discover page
    const test2 = await testFeature('Guest access to discover page', async () => {
      await page.waitForSelector('text=Discover', { timeout: 5000 });
      await page.waitForSelector('text=Trending Now', { timeout: 5000 });
    });
    results.total++;
    if (test2.passed) results.passed.push(test2.name);
    else results.failed.push(test2.name);

    // Test 3: Bet cards are displayed
    const test3 = await testFeature('Bet cards are displayed', async () => {
      await page.waitForSelector('[data-testid="bet-card"]', { timeout: 10000 });
      const betCards = await page.locator('[data-testid="bet-card"]').count();
      if (betCards === 0) throw new Error('No bet cards found');
      console.log(`   Found ${betCards} bet cards`);
    });
    results.total++;
    if (test3.passed) results.passed.push(test3.name);
    else results.failed.push(test3.name);

    // Test 4: Search input is present
    const test4 = await testFeature('Search input is present', async () => {
      await page.waitForSelector('input[placeholder="Search bets, topics, or creators..."]', { timeout: 5000 });
    });
    results.total++;
    if (test4.passed) results.passed.push(test4.name);
    else results.failed.push(test4.name);

    // Test 5: Bottom navigation tabs are present
    const test5 = await testFeature('Bottom navigation tabs are present', async () => {
      // Wait for navigation to load
      await page.waitForTimeout(2000);
      
      // Check for navigation buttons
      const discoverButton = await page.locator('button:has-text("Discover")').count();
      const myBetsButton = await page.locator('button:has-text("My Bets")').count();
      const createButton = await page.locator('button:has-text("Create")').count();
      const clubsButton = await page.locator('button:has-text("Clubs")').count();
      const signInButton = await page.locator('button:has-text("Sign In")').count();
      
      if (discoverButton === 0) throw new Error('Discover button not found');
      if (myBetsButton === 0) throw new Error('My Bets button not found');
      if (createButton === 0) throw new Error('Create button not found');
      if (clubsButton === 0) throw new Error('Clubs button not found');
      if (signInButton === 0) throw new Error('Sign In button not found');
      
      console.log(`   Navigation buttons: Discover(${discoverButton}), My Bets(${myBetsButton}), Create(${createButton}), Clubs(${clubsButton}), Sign In(${signInButton})`);
    });
    results.total++;
    if (test5.passed) results.passed.push(test5.name);
    else results.failed.push(test5.name);

    // Test 6: Navigation to My Bets tab (should show sign in prompt)
    const test6 = await testFeature('Navigation to My Bets tab (guest)', async () => {
      await page.click('button:has-text("My Bets")');
      await page.waitForTimeout(2000);
      // Should show sign in prompt for guests
      await page.waitForSelector('text=Sign in to view your bets', { timeout: 5000 });
    });
    results.total++;
    if (test6.passed) results.passed.push(test6.name);
    else results.failed.push(test6.name);

    // Test 7: Navigation to Clubs tab
    const test7 = await testFeature('Navigation to Clubs tab', async () => {
      await page.click('button:has-text("Clubs")');
      await page.waitForTimeout(2000);
      await page.waitForSelector('text=Popular Clubs', { timeout: 5000 });
    });
    results.total++;
    if (test7.passed) results.passed.push(test7.name);
    else results.failed.push(test7.name);

    // Test 8: Navigation to Profile tab (should show sign in)
    const test8 = await testFeature('Navigation to Profile tab (guest)', async () => {
      await page.click('button:has-text("Sign In")');
      await page.waitForTimeout(2000);
      await page.waitForSelector('text=Sign In', { timeout: 5000 });
    });
    results.total++;
    if (test8.passed) results.passed.push(test8.name);
    else results.failed.push(test8.name);

    // Test 9: Search functionality
    const test9 = await testFeature('Search functionality', async () => {
      await page.click('button:has-text("Discover")'); // Go back to discover
      await page.waitForTimeout(1000);
      await page.fill('input[placeholder="Search bets, topics, or creators..."]', 'Bitcoin');
      await page.waitForTimeout(1000);
      // Should filter results
      const bitcoinBets = await page.locator('text=Bitcoin').count();
      if (bitcoinBets === 0) throw new Error('Search did not find Bitcoin bets');
    });
    results.total++;
    if (test9.passed) results.passed.push(test9.name);
    else results.failed.push(test9.name);

    // Test 10: Bet detail navigation
    const test10 = await testFeature('Bet detail navigation', async () => {
      await page.click('[data-testid="bet-card"]');
      await page.waitForTimeout(2000);
      await page.waitForSelector('text=Place Bet', { timeout: 5000 });
    });
    results.total++;
    if (test10.passed) results.passed.push(test10.name);
    else results.failed.push(test10.name);

    // Test 11: Back navigation
    const test11 = await testFeature('Back navigation', async () => {
      await page.click('button[aria-label="Back"]');
      await page.waitForTimeout(2000);
      await page.waitForSelector('text=Discover', { timeout: 5000 });
    });
    results.total++;
    if (test11.passed) results.passed.push(test11.name);
    else results.failed.push(test11.name);

    // Test 12: User authentication flow
    const test12 = await testFeature('User authentication flow', async () => {
      await page.click('button:has-text("Sign In")');
      await page.waitForTimeout(1000);
      await page.fill('input[placeholder="Email"]', 'demo@example.com');
      await page.fill('input[placeholder="Password"]', 'password123');
      await page.click('button:has-text("Sign In")');
      await page.waitForTimeout(3000);
      // Should be logged in
      await page.waitForSelector('text=Welcome back', { timeout: 5000 });
    });
    results.total++;
    if (test12.passed) results.passed.push(test12.name);
    else results.failed.push(test12.name);

    // Test 13: Mobile responsiveness
    const test13 = await testFeature('Mobile responsiveness', async () => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.waitForTimeout(1000);
      await page.waitForSelector('text=Discover', { timeout: 5000 });
    });
    results.total++;
    if (test13.passed) results.passed.push(test13.name);
    else results.failed.push(test13.name);

    // Test 14: Performance check
    const test14 = await testFeature('Performance check', async () => {
      const startTime = Date.now();
      await page.reload();
      await page.waitForLoadState('networkidle');
      const loadTime = Date.now() - startTime;
      console.log(`   Page loaded in ${loadTime}ms`);
      if (loadTime > 5000) throw new Error(`Page load time too slow: ${loadTime}ms`);
    });
    results.total++;
    if (test14.passed) results.passed.push(test14.name);
    else results.failed.push(test14.name);

    // Test 15: Category filtering
    const test15 = await testFeature('Category filtering', async () => {
      await page.click('button:has-text("Sports")');
      await page.waitForTimeout(1000);
      // Should show sports bets
      const sportsBets = await page.locator('text=Premier League').count();
      if (sportsBets === 0) throw new Error('Category filtering did not work');
    });
    results.total++;
    if (test15.passed) results.passed.push(test15.name);
    else results.failed.push(test15.name);

  } catch (error) {
    console.log('❌ Test suite error:', error.message);
  } finally {
    await context.close();
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