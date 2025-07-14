import { chromium } from 'playwright';

async function debugClubsNavigation() {
  console.log('🔍 Debugging Clubs Navigation Issue...\n');
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    // Navigate to app
    console.log('📍 Navigating to app...');
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    
    // Check if demo button exists
    console.log('🔍 Looking for demo button...');
    const demoButton = page.locator('button:has-text("Try Demo")');
    const demoButtonExists = await demoButton.isVisible();
    console.log(`✅ Demo button visible: ${demoButtonExists}`);
    
    if (demoButtonExists) {
      console.log('🖱️ Clicking demo login...');
      await demoButton.click();
      await page.waitForLoadState('networkidle');
      
      // Wait a bit for auth to complete
      await page.waitForTimeout(2000);
      
      console.log('📍 Current URL:', page.url());
      
      // Debug bottom navigation
      console.log('\n🔍 Debugging Bottom Navigation...');
      
      // Check if bottom navigation exists
      const bottomNav = page.locator('[data-testid="bottom-navigation"]');
      const bottomNavExists = await bottomNav.isVisible();
      console.log(`✅ Bottom navigation visible: ${bottomNavExists}`);
      
      if (bottomNavExists) {
        console.log('📋 Bottom navigation HTML:');
        const bottomNavHTML = await bottomNav.innerHTML();
        console.log(bottomNavHTML);
        
        // Check for Clubs tab specifically
        console.log('\n🔍 Looking for Clubs tab...');
        
        // Method 1: data-testid
        const clubsTabByTestId = page.locator('[data-testid="nav-clubs"]');
        const clubsTabByTestIdExists = await clubsTabByTestId.isVisible();
        console.log(`✅ Clubs tab by data-testid visible: ${clubsTabByTestIdExists}`);
        
        // Method 2: text selector
        const clubsTabByText = page.locator('text=Clubs');
        const clubsTabByTextExists = await clubsTabByText.isVisible();
        console.log(`✅ Clubs tab by text visible: ${clubsTabByTextExists}`);
        
        // Method 3: within bottom navigation
        const clubsTabInNav = page.locator('[data-testid="bottom-navigation"] >> text=Clubs');
        const clubsTabInNavExists = await clubsTabInNav.isVisible();
        console.log(`✅ Clubs tab in nav visible: ${clubsTabInNavExists}`);
        
        // Method 4: aria-label
        const clubsTabByAria = page.locator('[aria-label="Clubs"]');
        const clubsTabByAriaExists = await clubsTabByAria.isVisible();
        console.log(`✅ Clubs tab by aria-label visible: ${clubsTabByAriaExists}`);
        
        // List all navigation tabs
        console.log('\n📋 All navigation tabs found:');
        const allNavTabs = page.locator('[data-testid="bottom-navigation"] button, [data-testid="bottom-navigation"] a');
        const tabCount = await allNavTabs.count();
        console.log(`Total navigation elements: ${tabCount}`);
        
        for (let i = 0; i < tabCount; i++) {
          const tab = allNavTabs.nth(i);
          const text = await tab.textContent();
          const isVisible = await tab.isVisible();
          const testId = await tab.getAttribute('data-testid');
          const ariaLabel = await tab.getAttribute('aria-label');
          console.log(`  Tab ${i + 1}: "${text}" (visible: ${isVisible}, testid: ${testId}, aria: ${ariaLabel})`);
        }
        
        // Try to click Clubs tab if found
        if (clubsTabByTestIdExists) {
          console.log('\n🖱️ Attempting to click Clubs tab by data-testid...');
          try {
            await clubsTabByTestId.click();
            console.log('✅ Successfully clicked Clubs tab by data-testid');
            await page.waitForTimeout(1000);
            console.log('📍 URL after click:', page.url());
          } catch (error) {
            console.log('❌ Failed to click Clubs tab by data-testid:', error.message);
          }
        } else if (clubsTabByTextExists) {
          console.log('\n🖱️ Attempting to click Clubs tab by text...');
          try {
            await clubsTabByText.click();
            console.log('✅ Successfully clicked Clubs tab by text');
            await page.waitForTimeout(1000);
            console.log('📍 URL after click:', page.url());
          } catch (error) {
            console.log('❌ Failed to click Clubs tab by text:', error.message);
          }
        } else {
          console.log('\n❌ No Clubs tab found with any method');
        }
        
      } else {
        console.log('❌ Bottom navigation not found');
        
        // Check if we're still on login page
        const currentUrl = page.url();
        console.log('📍 Current URL:', currentUrl);
        
        if (currentUrl.includes('/auth/login')) {
          console.log('⚠️ Still on login page - auth may not have completed');
          
          // Check for any error messages
          const errorMessages = page.locator('.error, .alert, [role="alert"]');
          const errorCount = await errorMessages.count();
          if (errorCount > 0) {
            console.log('❌ Error messages found:');
            for (let i = 0; i < errorCount; i++) {
              const error = errorMessages.nth(i);
              const errorText = await error.textContent();
              console.log(`  - ${errorText}`);
            }
          }
        }
      }
      
    } else {
      console.log('❌ Demo button not found');
    }
    
    // Take a screenshot for debugging
    console.log('\n📸 Taking screenshot...');
    await page.screenshot({ path: 'debug-clubs-navigation.png', fullPage: true });
    console.log('✅ Screenshot saved as debug-clubs-navigation.png');
    
  } catch (error) {
    console.error('❌ Error during debugging:', error);
  } finally {
    await browser.close();
  }
}

debugClubsNavigation().catch(console.error); 