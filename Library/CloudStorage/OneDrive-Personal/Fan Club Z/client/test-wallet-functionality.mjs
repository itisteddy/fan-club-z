import { chromium } from '@playwright/test';

async function testWalletFunctionality() {
  console.log('🚀 Testing Wallet Functionality...\n');
  
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Navigate to app
    console.log('📱 Loading app...');
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');

    // Demo login
    console.log('🔐 Performing demo login...');
    await page.click('button:has-text("Sign In")');
    await page.waitForTimeout(1000);
    
    await page.fill('input[type="email"]', 'demo@fanclubz.app');
    await page.fill('input[type="password"]', 'demo123');
    await page.click('button:has-text("Sign In")');
    await page.waitForTimeout(3000);

    // Navigate to wallet
    console.log('💰 Navigating to wallet...');
    await page.click('button:has-text("Wallet")');
    await page.waitForTimeout(2000);

    // Test 1: Check if wallet balance displays
    console.log('🧪 Test 1: Wallet balance display');
    try {
      await page.waitForSelector('[data-testid="wallet-balance-amount"]', { timeout: 5000 });
      const balanceText = await page.textContent('[data-testid="wallet-balance-amount"]');
      console.log(`✅ Balance displayed: ${balanceText}`);
    } catch (error) {
      console.log('❌ Wallet balance not found or not displaying');
      throw error;
    }

    // Test 2: Check if transaction history loads
    console.log('🧪 Test 2: Transaction history');
    try {
      await page.waitForSelector('[data-testid="transaction-list"]', { timeout: 5000 });
      const transactionItems = await page.locator('[data-testid="transaction-item"]').count();
      console.log(`✅ Transaction list found with ${transactionItems} items`);
    } catch (error) {
      console.log('❌ Transaction history not loading');
      throw error;
    }

    // Test 3: Check wallet access after demo login
    console.log('🧪 Test 3: Wallet access verification');
    const walletHeader = await page.locator('h1:has-text("Wallet")').count();
    if (walletHeader > 0) {
      console.log('✅ Wallet page accessible after demo login');
    } else {
      console.log('❌ Wallet page not accessible');
      throw new Error('Wallet not accessible');
    }

    // Check for any console errors
    console.log('🧪 Checking for console errors...');
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('🔴 Console Error:', msg.text());
      }
    });

    // Check API calls
    console.log('🧪 Monitoring API calls...');
    let balanceApiCalled = false;
    let transactionApiCalled = false;

    page.on('response', response => {
      const url = response.url();
      if (url.includes('/api/wallet/balance')) {
        balanceApiCalled = true;
        console.log(`📡 Balance API called: ${response.status()} - ${url}`);
      }
      if (url.includes('/api/transactions')) {
        transactionApiCalled = true;
        console.log(`📡 Transactions API called: ${response.status()} - ${url}`);
      }
    });

    // Refresh to trigger API calls
    await page.reload();
    await page.waitForTimeout(3000);

    console.log(`📊 Balance API called: ${balanceApiCalled}`);
    console.log(`📊 Transactions API called: ${transactionApiCalled}`);

    console.log('✅ Wallet functionality test completed!');

  } catch (error) {
    console.log('❌ Wallet test failed:', error.message);
    
    // Take screenshot for debugging
    await page.screenshot({ path: 'wallet-test-error.png' });
    console.log('📸 Screenshot saved as wallet-test-error.png');
  } finally {
    await context.close();
    await browser.close();
  }
}

testWalletFunctionality().catch(console.error);
