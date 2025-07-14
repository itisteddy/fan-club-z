import { chromium } from 'playwright';

async function debugAuthState() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    console.log('🔍 Debugging authentication state...');
    
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
    
    // Check localStorage for auth token
    const authToken = await page.evaluate(() => localStorage.getItem('auth_token'));
    console.log('🔑 Auth token in localStorage:', authToken ? 'Present' : 'Missing', '| Value:', authToken);
    
    // Check localStorage for user data
    const userData = await page.evaluate(() => localStorage.getItem('user'));
    console.log('👤 User data in localStorage:', userData ? 'Present' : 'Missing');
    
    if (userData) {
      const user = JSON.parse(userData);
      console.log('👤 User details:', { id: user.id, email: user.email });
    }
    
    // Check if we're authenticated by looking for authenticated-only elements
    const bottomNav = await page.locator('[data-testid="bottom-navigation"]');
    const bottomNavExists = await bottomNav.count();
    console.log('🔍 Bottom navigation found:', bottomNavExists);
    
    if (bottomNavExists > 0) {
      // Check for authenticated tabs
      const myBetsTab = await page.locator('[data-testid="bottom-navigation"] >> text=My Bets');
      const myBetsExists = await myBetsTab.count();
      console.log('🔍 My Bets tab found:', myBetsExists);
      
      const createTab = await page.locator('[data-testid="bottom-navigation"] >> text=Create');
      const createExists = await createTab.count();
      console.log('🔍 Create tab found:', createExists);
      
      const walletTab = await page.locator('[data-testid="bottom-navigation"] >> text=Wallet');
      const walletExists = await walletTab.count();
      console.log('🔍 Wallet tab found:', walletExists);
    }
    
    // Try to navigate to a protected route
    console.log('🔗 Testing navigation to protected route...');
    await page.goto('http://localhost:3000/bets');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    const betsUrl = page.url();
    console.log('📍 URL after navigating to /bets:', betsUrl);
    
    // Try wallet again
    console.log('🔗 Testing navigation to wallet...');
    await page.goto('http://localhost:3000/wallet');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    const walletUrl = page.url();
    console.log('📍 URL after navigating to /wallet:', walletUrl);
    
    // Check if we're being redirected to login
    if (walletUrl.includes('/auth/login')) {
      console.log('❌ Wallet route is redirecting to login - authentication issue detected');
    } else if (walletUrl.includes('/wallet')) {
      console.log('✅ Wallet route is accessible - authentication is working');
    }
    
    // Take a screenshot
    await page.screenshot({ path: 'debug-auth-state.png', fullPage: true });
    console.log('📸 Screenshot saved as debug-auth-state.png');
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
    await page.screenshot({ path: 'debug-auth-state-error.png', fullPage: true });
  } finally {
    await browser.close();
  }
}

debugAuthState(); 