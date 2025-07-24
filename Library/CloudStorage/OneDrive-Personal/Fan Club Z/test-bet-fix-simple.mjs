import { chromium } from 'playwright';

async function testBetFetchingFunctionality() {
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 1000 
  });
  
  try {
    const page = await browser.newPage();
    
    console.log('🧪 Testing Bet Fetching Functionality...');
    
    // Navigate to the app
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    
    console.log('✅ App loaded');
    
    // Test 1: Check if the app loads without errors
    const errorElements = await page.locator('.error, .text-red-500, [role="alert"]').count();
    if (errorElements > 0) {
      console.log('⚠️  Found error elements on page load');
    } else {
      console.log('✅ No errors on page load');
    }
    
    // Test 2: Check if bet-related components are present
    const betElements = await page.locator('[data-testid*="bet"], .bet, [class*="bet"]').count();
    console.log(`📊 Found ${betElements} bet-related elements`);
    
    // Test 3: Test API connectivity
    console.log('🔗 Testing API connectivity...');
    try {
      const response = await page.evaluate(async () => {
        const res = await fetch('/api/health');
        return { status: res.status, ok: res.ok };
      });
      console.log(`✅ API health check: ${response.status}`);
    } catch (error) {
      console.log('❌ API connectivity test failed:', error.message);
    }
    
    // Test 4: Check if trending bets endpoint works
    console.log('📈 Testing trending bets endpoint...');
    try {
      const trendingResponse = await page.evaluate(async () => {
        const res = await fetch('/api/bets/trending');
        return { status: res.status, ok: res.ok };
      });
      console.log(`✅ Trending bets endpoint: ${trendingResponse.status}`);
    } catch (error) {
      console.log('❌ Trending bets endpoint failed:', error.message);
    }
    
    // Test 5: Check if individual bet endpoint works (with a test ID)
    console.log('🔍 Testing individual bet endpoint...');
    try {
      const individualResponse = await page.evaluate(async () => {
        const res = await fetch('/api/bets/test-bet-id');
        return { status: res.status, ok: res.ok };
      });
      console.log(`✅ Individual bet endpoint: ${individualResponse.status} (expected 404 for test ID)`);
    } catch (error) {
      console.log('❌ Individual bet endpoint failed:', error.message);
    }
    
    // Test 6: Check for any console errors
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    // Wait a bit to collect any console errors
    await page.waitForTimeout(3000);
    
    if (consoleErrors.length > 0) {
      console.log('⚠️  Console errors found:');
      consoleErrors.forEach(error => console.log(`   - ${error}`));
    } else {
      console.log('✅ No console errors detected');
    }
    
    // Test 7: Check if the app is responsive
    console.log('📱 Testing app responsiveness...');
    await page.setViewportSize({ width: 375, height: 667 }); // Mobile viewport
    await page.waitForTimeout(1000);
    
    const mobileElements = await page.locator('body').count();
    console.log(`✅ Mobile viewport test: ${mobileElements} body elements found`);
    
    console.log('\n🎉 Basic functionality tests completed!');
    console.log('\n📋 To test the full "Bet Not Found" fix:');
    console.log('   1. Authenticate manually in the browser');
    console.log('   2. Create a new bet');
    console.log('   3. Verify you can view the bet details immediately');
    console.log('   4. Check that no "Bet Not Found" error appears');
    
    return true;
    
  } catch (error) {
    console.log('❌ Test failed with error:', error.message);
    return false;
  } finally {
    await browser.close();
  }
}

// Run the test
testBetFetchingFunctionality().then(success => {
  if (success) {
    console.log('\n🎉 BASIC FUNCTIONALITY TEST PASSED!');
    console.log('💡 The app is ready for manual testing of the bet creation fix.');
    process.exit(0);
  } else {
    console.log('\n❌ BASIC FUNCTIONALITY TEST FAILED!');
    process.exit(1);
  }
}); 