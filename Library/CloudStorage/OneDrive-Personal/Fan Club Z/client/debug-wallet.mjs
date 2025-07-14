import { chromium } from 'playwright';

async function debugWallet() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    console.log('🔍 Starting wallet debug test...');
    
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
    
    // Check if we're on the main app page
    const currentUrl = page.url();
    console.log('📍 Current URL:', currentUrl);
    
    // Check if bottom navigation exists
    const bottomNav = await page.locator('[data-testid="bottom-navigation"]');
    const bottomNavExists = await bottomNav.count();
    console.log('🔍 Bottom navigation elements found:', bottomNavExists);
    
    if (bottomNavExists > 0) {
      // Check if wallet tab exists
      const walletTab = await page.locator('[data-testid="bottom-navigation"] >> text=Wallet');
      const walletTabExists = await walletTab.count();
      console.log('🔍 Wallet tab elements found:', walletTabExists);
      
      if (walletTabExists > 0) {
        console.log('✅ Wallet tab found, attempting to click...');
        await walletTab.click();
        await page.waitForTimeout(2000);
        
        // Check if wallet page loaded
        const walletHeader = await page.locator('header h1:has-text("Wallet")');
        const walletHeaderExists = await walletHeader.count();
        console.log('🔍 Wallet header elements found:', walletHeaderExists);
        
        if (walletHeaderExists > 0) {
          console.log('✅ Wallet page loaded successfully!');
          
          // Check for balance
          const balanceElement = await page.locator('[data-testid="wallet-balance-amount"]');
          const balanceExists = await balanceElement.count();
          console.log('🔍 Balance element found:', balanceExists);
          
          if (balanceExists > 0) {
            const balanceText = await balanceElement.textContent();
            console.log('💰 Balance displayed:', balanceText);
          }
        } else {
          console.log('❌ Wallet header not found');
        }
      } else {
        console.log('❌ Wallet tab not found in bottom navigation');
      }
    } else {
      console.log('❌ Bottom navigation not found');
      
      // Check what's actually on the page
      const pageContent = await page.content();
      console.log('📄 Page contains "bottom-navigation":', pageContent.includes('bottom-navigation'));
      console.log('📄 Page contains "Wallet":', pageContent.includes('Wallet'));
    }
    
    // Take a screenshot for debugging
    await page.screenshot({ path: 'debug-wallet.png', fullPage: true });
    console.log('📸 Screenshot saved as debug-wallet.png');
    
  } catch (error) {
    console.error('❌ Debug test failed:', error);
    await page.screenshot({ path: 'debug-wallet-error.png', fullPage: true });
  } finally {
    await browser.close();
  }
}

debugWallet(); 