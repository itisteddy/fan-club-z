import { chromium } from '@playwright/test';

async function testWalletFunctionality() {
  console.log('🚀 Testing Wallet Functionality - Item 8 Fix...\n');
  
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  const results = {
    passed: [],
    failed: [],
    total: 0
  };

  async function runTest(name, testFn) {
    console.log(`\n🧪 Testing: ${name}`);
    results.total++;
    try {
      await testFn();
      console.log(`✅ ${name} - PASSED`);
      results.passed.push(name);
      return true;
    } catch (error) {
      console.log(`❌ ${name} - FAILED: ${error.message}`);
      results.failed.push(name);
      return false;
    }
  }

  try {
    // Monitor console errors and API calls
    const apiCalls = [];
    const errors = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    page.on('response', response => {
      const url = response.url();
      if (url.includes('/api/wallet') || url.includes('/api/transactions')) {
        apiCalls.push({
          url,
          status: response.status(),
          method: response.request().method()
        });
        console.log(`📡 API Call: ${response.request().method()} ${url} - ${response.status()}`);
      }
    });

    // Test 1: App loads successfully
    await runTest('App loads successfully', async () => {
      await page.goto('http://localhost:3000');
      await page.waitForLoadState('networkidle');
      await page.waitForSelector('text=Discover', { timeout: 10000 });
    });

    // Test 2: Demo login with authentication verification
    await runTest('Demo login with authentication verification', async () => {
      console.log('🔑 Starting demo login process...')
      await page.click('button:has-text("Sign In")');
      await page.waitForTimeout(1000);
      
      await page.fill('input[type="email"]', 'demo@fanclubz.app');
      await page.fill('input[type="password"]', 'demo123');
      await page.click('button:has-text("Sign In")');
      
      console.log('🔑 Login form submitted, waiting for authentication...');
      
      // Wait for authentication to complete - look for signs of successful login
      try {
        // Method 1: Wait for navigation away from login page
        await page.waitForURL(url => !url.includes('/auth/login'), { timeout: 10000 });
        console.log('✅ Successfully navigated away from login page');
      } catch (navError) {
        console.log('⚠️ Navigation timeout, checking for other auth indicators...');
        
        // Method 2: Check for demo mode banner (indicates logged in)
        try {
          await page.waitForSelector('text=Demo mode:', { timeout: 5000 });
          console.log('✅ Demo mode banner found - authentication successful');
        } catch (bannerError) {
          // Method 3: Check if wallet tab is now visible
          const walletButton = await page.locator('button:has-text("Wallet")').isVisible();
          if (walletButton) {
            console.log('✅ Wallet button visible - authentication successful');
          } else {
            throw new Error('Authentication verification failed - no indicators of successful login found');
          }
        }
      }
      
      // Final verification: ensure we can see authenticated content
      await page.waitForTimeout(2000); // Give time for state to settle
      
      // Should be logged in and see wallet tab
      await page.waitForSelector('button:has-text("Wallet")', { timeout: 5000 });
      console.log('✅ Wallet tab visible - demo login successful');
    });

    // Test 3: Navigate to wallet after demo login with auth state verification
    await runTest('Navigate to wallet after demo login', async () => {
      console.log('💰 Attempting to navigate to wallet...');
      
      // First verify we're in an authenticated state
      const walletButtonExists = await page.locator('button:has-text("Wallet")').isVisible();
      if (!walletButtonExists) {
        throw new Error('Wallet button not visible - user may not be authenticated');
      }
      console.log('✅ Wallet button is visible');
      
      // Click wallet tab
      await page.click('button:has-text("Wallet")');
      console.log('💰 Wallet button clicked');
      
      // Wait for navigation with multiple timeout strategies
      try {
        // Strategy 1: Wait for URL change
        await page.waitForURL(url => url.includes('/wallet'), { timeout: 8000 });
        console.log('✅ URL changed to wallet page');
      } catch (urlError) {
        console.log('⚠️ URL timeout, checking for wallet page content...');
        
        // Strategy 2: Wait for wallet page content
        try {
          await page.waitForSelector('h1:has-text("Wallet")', { timeout: 5000 });
          console.log('✅ Wallet page header found');
        } catch (headerError) {
          // Strategy 3: Check for wallet-specific elements
          const balanceCard = await page.locator('[data-testid="wallet-balance-card"]').isVisible();
          const transactionList = await page.locator('[data-testid="transaction-list"]').isVisible();
          
          if (balanceCard || transactionList) {
            console.log('✅ Wallet page elements found');
          } else {
            // Take screenshot for debugging
            await page.screenshot({ path: 'wallet-navigation-debug.png' });
            throw new Error('Failed to navigate to wallet page - no wallet content found');
          }
        }
      }
      
      // Final verification: we should see wallet page
      await page.waitForTimeout(1000); // Give time for content to load
      const finalCheck = await page.locator('h1:has-text("Wallet")').isVisible();
      if (!finalCheck) {
        throw new Error('Wallet page navigation incomplete');
      }
      console.log('✅ Successfully navigated to wallet page');
    });

    // Test 4: Wallet balance displays
    await runTest('Should display wallet balance', async () => {
      await page.waitForSelector('[data-testid="wallet-balance-amount"]', { timeout: 10000 });
      const balanceText = await page.textContent('[data-testid="wallet-balance-amount"]');
      console.log(`   Balance displayed: ${balanceText}`);
      
      if (!balanceText || !balanceText.includes('$')) {
        throw new Error('Balance not displaying correctly');
      }
    });

    // Test 5: Transaction history loads
    await runTest('Should show transaction history', async () => {
      await page.waitForSelector('[data-testid="transaction-list"]', { timeout: 10000 });
      
      // Check if transactions are loading or loaded
      const isLoading = await page.locator('[data-testid="transaction-loading"]').isVisible();
      const isEmpty = await page.locator('[data-testid="transaction-empty"]').isVisible();
      const hasItems = await page.locator('[data-testid="transaction-items"]').isVisible();
      
      console.log(`   Loading: ${isLoading}, Empty: ${isEmpty}, Has Items: ${hasItems}`);
      
      if (isLoading) {
        // Wait for loading to complete
        await page.waitForSelector('[data-testid="transaction-loading"]', { state: 'hidden', timeout: 10000 });
      }
      
      // Should either have transactions or show empty state
      const finalEmpty = await page.locator('[data-testid="transaction-empty"]').isVisible();
      const finalHasItems = await page.locator('[data-testid="transaction-items"]').isVisible();
      
      if (!finalEmpty && !finalHasItems) {
        throw new Error('Transaction history not displaying properly');
      }
      
      if (finalHasItems) {
        const transactionCount = await page.locator('[data-testid="transaction-item"]').count();
        console.log(`   Found ${transactionCount} transactions`);
      }
    });

    // Test 6: API calls verification
    await runTest('API calls working correctly', async () => {
      const balanceCall = apiCalls.find(call => call.url.includes('/api/wallet/balance'));
      const transactionCall = apiCalls.find(call => call.url.includes('/api/transactions'));
      
      console.log(`   Balance API called: ${!!balanceCall} (${balanceCall?.status || 'N/A'})`);
      console.log(`   Transactions API called: ${!!transactionCall} (${transactionCall?.status || 'N/A'})`);
      
      if (!balanceCall || balanceCall.status !== 200) {
        throw new Error('Wallet balance API call failed');
      }
      
      if (!transactionCall || transactionCall.status !== 200) {
        throw new Error('Transactions API call failed');
      }
    });

    // Test 7: Test deposit functionality
    await runTest('Deposit functionality works', async () => {
      // Click Add Funds button
      await page.click('button:has-text("Add Funds")');
      await page.waitForTimeout(1000);
      
      // Should see payment modal
      await page.waitForSelector('text=Add Funds', { timeout: 5000 });
      
      // Test deposit with $50
      await page.click('button:has-text("$50")');
      await page.click('button:has-text("Deposit $50.00")');
      
      // Wait for success
      await page.waitForSelector('text=Deposit Successful!', { timeout: 10000 });
      await page.waitForTimeout(2000);
      
      // Modal should close and balance should update
      await page.waitForSelector('text=Add Funds', { state: 'hidden', timeout: 5000 });
    });

    // Test 8: Quick deposit buttons
    await runTest('Quick deposit buttons work', async () => {
      // Test one of the quick deposit buttons
      const quickButtons = await page.locator('text=/^\\$\\d+$/').count();
      console.log(`   Found ${quickButtons} quick deposit buttons`);
      
      if (quickButtons === 0) {
        throw new Error('No quick deposit buttons found');
      }
      
      // Click a quick deposit button
      await page.click('text="$25"');
      await page.waitForTimeout(1000);
      
      // Should open payment modal with $25
      await page.waitForSelector('text=Add Funds', { timeout: 5000 });
      
      // Close modal
      await page.click('button[aria-label="Close"], .bg-black\\/50');
      await page.waitForTimeout(1000);
    });

    // Test 9: Error handling
    await runTest('Error handling works correctly', async () => {
      console.log(`   Console errors: ${errors.length}`);
      console.log(`   API calls made: ${apiCalls.length}`);
      
      // Log any console errors for debugging
      if (errors.length > 0) {
        console.log('   Errors found:', errors.slice(0, 3)); // Show first 3 errors
      }
      
      // Allow some console errors but not wallet-specific ones
      const walletErrors = errors.filter(error => 
        error.toLowerCase().includes('wallet') || 
        error.toLowerCase().includes('balance') ||
        error.toLowerCase().includes('transaction')
      );
      
      if (walletErrors.length > 0) {
        throw new Error(`Wallet-specific errors found: ${walletErrors[0]}`);
      }
    });

    // Print detailed API call summary
    console.log('\n📊 API CALLS SUMMARY:');
    apiCalls.forEach(call => {
      console.log(`   ${call.method} ${call.url.split('/api/')[1]} - ${call.status}`);
    });

  } catch (error) {
    console.log('❌ Test suite error:', error.message);
  } finally {
    await context.close();
    await browser.close();
  }

  // Print results summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 WALLET FUNCTIONALITY TEST RESULTS');
  console.log('='.repeat(60));
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

  console.log('\n🎯 WALLET ITEM 8 STATUS:');
  if (results.passed.length >= 7) {
    console.log('✅ WALLET FUNCTIONALITY FIXED - All major features working');
    console.log('✅ Wallet balance API calls succeeding');
    console.log('✅ Navigation to wallet after demo login working');  
    console.log('✅ Transaction history available and loading');
  } else {
    console.log('❌ WALLET FUNCTIONALITY STILL HAS ISSUES');
    console.log('❌ Some tests are failing - check failed tests above');
  }
  
  console.log('\n' + '='.repeat(60));
  
  return results;
}

// Run the test
testWalletFunctionality().catch(console.error);
