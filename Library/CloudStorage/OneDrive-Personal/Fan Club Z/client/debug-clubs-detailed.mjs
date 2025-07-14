import { chromium } from 'playwright';

async function debugClubsDetailed() {
  console.log('🔍 Detailed Clubs Debug - Capturing Browser Console...\n');
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  // Capture all console messages
  const consoleMessages = [];
  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    consoleMessages.push({ type, text, timestamp: new Date().toISOString() });
    
    // Log important messages immediately
    if (text.includes('ClubsTab') || text.includes('clubs') || text.includes('API') || text.includes('Error')) {
      console.log(`🔍 [${type.toUpperCase()}]: ${text}`);
    }
  });
  
  // Capture network requests
  const networkRequests = [];
  page.on('request', request => {
    if (request.url().includes('/api/')) {
      networkRequests.push({
        url: request.url(),
        method: request.method(),
        timestamp: new Date().toISOString()
      });
      console.log(`🌐 [REQUEST] ${request.method()} ${request.url()}`);
    }
  });
  
  page.on('response', response => {
    if (response.url().includes('/api/')) {
      console.log(`🌐 [RESPONSE] ${response.status()} ${response.url()}`);
    }
  });
  
  try {
    // Navigate to app
    console.log('📍 Navigating to app...');
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    
    // Demo login
    console.log('🔐 Performing demo login...');
    const demoButton = page.locator('button:has-text("Try Demo")');
    await demoButton.click();
    await page.waitForTimeout(3000);
    
    // Navigate to clubs
    console.log('🎯 Navigating to clubs...');
    const clubsTab = page.locator('[data-testid="nav-clubs"]');
    await clubsTab.click();
    await page.waitForTimeout(2000);
    
    // Wait for any API calls to complete
    console.log('⏳ Waiting for API calls to complete...');
    await page.waitForTimeout(3000);
    
    // Check if we're on the clubs page
    console.log('📍 Checking page state...')
    
    try {
      // Use more specific selectors to avoid strict mode violations
      const headerTitle = await page.locator('header h1:has-text("Clubs")').isVisible()
      console.log('📋 Header title visible:', headerTitle)
      
      const clubsCount = await page.locator('div:has-text("Clubs Count: 3")').isVisible()
      console.log('📊 Clubs count visible:', clubsCount)
      
      const debugPanel = await page.locator('div:has-text("Debug Info:")').isVisible()
      console.log('🐛 Debug panel visible:', debugPanel)
      
      // Check for club cards
      const clubCards = await page.locator('[data-testid="clubs-list"]').isVisible()
      console.log('🎴 Clubs list visible:', clubCards)
      
      // Check for category buttons
      const categoryButtons = await page.locator('button:has-text("🏠 All")').isVisible()
      console.log('🏷️ Category buttons visible:', categoryButtons)
      
      console.log('✅ Page state analysis completed successfully!')
    } catch (error) {
      console.log('❌ Error during debugging:', error.message)
    }
    
    // Check for clubs header
    const clubsHeader = page.locator('text=Clubs');
    const hasClubsHeader = await clubsHeader.isVisible();
    console.log(`🏆 Clubs header visible: ${hasClubsHeader}`);
    
    // Check for categories
    const categories = page.locator('text=All, text=Sports, text=Crypto, text=Entertainment');
    const categoryCount = await categories.count();
    console.log(`📂 Categories found: ${categoryCount}`);
    
    // Check for club cards
    const clubCards = page.locator('[data-testid="club-card"]');
    const clubCardCount = await clubCards.count();
    console.log(`🏆 Club cards found: ${clubCardCount}`);
    
    // Check for loading states
    const loadingSpinners = page.locator('.animate-spin, [data-testid="loading"]');
    const loadingCount = await loadingSpinners.count();
    console.log(`⏳ Loading spinners: ${loadingCount}`);
    
    // Check for error messages
    const errorMessages = page.locator('.text-red-500, .bg-red-50, [role="alert"]');
    const errorCount = await errorMessages.count();
    console.log(`❌ Error messages: ${errorCount}`);
    
    if (errorCount > 0) {
      console.log('📋 Error messages found:');
      for (let i = 0; i < errorCount; i++) {
        const error = errorMessages.nth(i);
        const errorText = await error.textContent();
        console.log(`  ${i + 1}. ${errorText}`);
      }
    }
    
    // Check for debug panel
    const debugPanel = page.locator('.bg-yellow-100');
    const hasDebugPanel = await debugPanel.isVisible();
    console.log(`🐛 Debug panel visible: ${hasDebugPanel}`);
    
    if (hasDebugPanel) {
      const debugText = await debugPanel.textContent();
      console.log('📋 Debug panel content:');
      console.log(debugText);
    }
    
    // Analyze console messages
    console.log('\n📋 Console Messages Analysis:');
    const clubsMessages = consoleMessages.filter(msg => 
      msg.text.includes('ClubsTab') || 
      msg.text.includes('clubs') || 
      msg.text.includes('API')
    );
    
    if (clubsMessages.length > 0) {
      console.log('🔍 Clubs-related console messages:');
      clubsMessages.forEach(msg => {
        console.log(`  [${msg.type.toUpperCase()}] ${msg.text}`);
      });
    } else {
      console.log('⚠️ No clubs-related console messages found');
    }
    
    // Analyze network requests
    console.log('\n🌐 Network Requests Analysis:');
    const clubsRequests = networkRequests.filter(req => 
      req.url.includes('/clubs')
    );
    
    if (clubsRequests.length > 0) {
      console.log('🔍 Clubs API requests:');
      clubsRequests.forEach(req => {
        console.log(`  ${req.method} ${req.url}`);
      });
    } else {
      console.log('⚠️ No clubs API requests found');
    }
    
    // Take screenshot
    console.log('\n📸 Taking screenshot...');
    await page.screenshot({ path: 'debug-clubs-detailed.png', fullPage: true });
    console.log('✅ Screenshot saved as debug-clubs-detailed.png');
    
    // Summary
    console.log('\n📊 Summary:');
    console.log(`✅ Navigation: ${currentUrl.includes('/clubs') ? 'WORKING' : 'FAILED'}`);
    console.log(`✅ Clubs header: ${hasClubsHeader ? 'VISIBLE' : 'MISSING'}`);
    console.log(`✅ Categories: ${categoryCount > 0 ? `${categoryCount} FOUND` : 'MISSING'}`);
    console.log(`✅ Club cards: ${clubCardCount > 0 ? `${clubCardCount} FOUND` : 'MISSING'}`);
    console.log(`✅ API requests: ${clubsRequests.length > 0 ? 'MADE' : 'NONE'}`);
    console.log(`✅ Console logs: ${clubsMessages.length > 0 ? 'PRESENT' : 'MISSING'}`);
    
  } catch (error) {
    console.error('❌ Error during debugging:', error);
  } finally {
    await browser.close();
  }
}

debugClubsDetailed().catch(console.error); 