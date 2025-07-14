import { chromium } from 'playwright';

async function testWalletDirect() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    console.log('🔍 Testing wallet functionality directly...');
    
    // Navigate to the app
    await page.goto('http://localhost:3000');
    console.log('✅ Navigated to app');
    
    // Wait for login page to load
    await page.waitForSelector('button:has-text("Try Demo")', { timeout: 10000 });
    console.log('✅ Demo button found');
    
    // Click demo login
    await page.click('button:has-text("Try Demo")');
    console.log('✅ Clicked demo login');
    
    // Wait for navigation to complete
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    console.log('✅ Demo login completed');
    
    // Check current URL
    const currentUrl = page.url();
    console.log('📍 Current URL after login:', currentUrl);
    
    // Navigate directly to wallet page
    console.log('🔗 Navigating directly to wallet page...');
    await page.goto('http://localhost:3000/wallet');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    const walletUrl = page.url();
    console.log('📍 URL after direct navigation:', walletUrl);
    
    // Check if we're on the wallet page
    if (walletUrl.includes('/wallet')) {
      console.log('✅ Successfully navigated to wallet page!');
      
      // Check for wallet header
      const walletHeader = await page.locator('header h1:has-text("Wallet")');
      const headerExists = await walletHeader.count();
      console.log('🔍 Wallet header found:', headerExists);
      
      if (headerExists > 0) {
        console.log('✅ Wallet header is visible!');
        
        // Check for balance
        const balanceElement = await page.locator('[data-testid="wallet-balance-amount"]');
        const balanceExists = await balanceElement.count();
        console.log('🔍 Balance element found:', balanceExists);
        
        if (balanceExists > 0) {
          const balanceText = await balanceElement.textContent();
          console.log('💰 Balance displayed:', balanceText);
          
          // Check for transaction history
          const transactionElements = await page.locator('[data-testid="transaction-item"]');
          const transactionCount = await transactionElements.count();
          console.log('📋 Transaction items found:', transactionCount);
          
          // Check for quick deposit buttons
          const quickDepositButtons = await page.locator('button:has-text("$10"), button:has-text("$25"), button:has-text("$50")');
          const quickDepositCount = await quickDepositButtons.count();
          console.log('💳 Quick deposit buttons found:', quickDepositCount);
          
          console.log('🎉 WALLET FUNCTIONALITY IS WORKING!');
          console.log('✅ Balance: ' + balanceText);
          console.log('✅ Transactions: ' + transactionCount + ' items');
          console.log('✅ Quick deposits: ' + quickDepositCount + ' buttons');
        } else {
          console.log('❌ Balance element not found');
        }
      } else {
        console.log('❌ Wallet header not found');
      }
    } else {
      console.log('❌ Navigation to wallet page failed');
      console.log('Expected URL to contain /wallet, but got:', walletUrl);
    }
    
    // Take a screenshot
    await page.screenshot({ path: 'test-wallet-direct.png', fullPage: true });
    console.log('📸 Screenshot saved as test-wallet-direct.png');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    await page.screenshot({ path: 'test-wallet-direct-error.png', fullPage: true });
  } finally {
    await browser.close();
  }
}

testWalletDirect(); 