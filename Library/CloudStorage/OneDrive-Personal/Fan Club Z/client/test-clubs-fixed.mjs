import { chromium } from 'playwright';

async function testClubsNavigation() {
  console.log('🧪 Testing Clubs Navigation (Fixed)...\n');
  
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
      
      // Wait for login to complete
      console.log('⏳ Waiting for login to complete...');
      await page.waitForTimeout(3000);
      
      // Check if we're on main app
      const currentUrl = page.url();
      console.log('📍 Current URL:', currentUrl);
      
      // Check for bottom navigation
      const bottomNav = page.locator('[data-testid="bottom-navigation"]');
      const bottomNavExists = await bottomNav.isVisible();
      console.log(`✅ Bottom navigation visible: ${bottomNavExists}`);
      
      if (bottomNavExists) {
        console.log('🎯 Testing Clubs navigation...');
        
        // Try to click Clubs tab
        const clubsTab = page.locator('[data-testid="nav-clubs"]');
        const clubsTabExists = await clubsTab.isVisible();
        console.log(`✅ Clubs tab visible: ${clubsTabExists}`);
        
        if (clubsTabExists) {
          console.log('🖱️ Clicking Clubs tab...');
          await clubsTab.click();
          await page.waitForTimeout(2000);
          
          const clubsUrl = page.url();
          console.log('📍 URL after clicking Clubs:', clubsUrl);
          
          if (clubsUrl.includes('/clubs')) {
            console.log('✅ Successfully navigated to Clubs page!');
            
            // Check for clubs content
            const clubsHeader = page.locator('text=Clubs');
            const clubsHeaderExists = await clubsHeader.isVisible();
            console.log(`✅ Clubs header visible: ${clubsHeaderExists}`);
            
            // Check for club cards
            const clubCards = page.locator('[data-testid="club-card"]');
            const clubCardCount = await clubCards.count();
            console.log(`📊 Found ${clubCardCount} club cards`);
            
            if (clubCardCount > 0) {
              console.log('✅ Club Management feature is working correctly!');
              return true;
            } else {
              console.log('⚠️ No club cards found - backend may not be returning data');
              return false;
            }
          } else {
            console.log('❌ Navigation to Clubs failed');
            return false;
          }
        } else {
          console.log('❌ Clubs tab not found in bottom navigation');
          return false;
        }
      } else {
        console.log('❌ Bottom navigation not found after login');
        return false;
      }
    } else {
      console.log('❌ Demo button not found');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Error during testing:', error);
    return false;
  } finally {
    await browser.close();
  }
}

testClubsNavigation().then(success => {
  if (success) {
    console.log('\n🎉 Clubs navigation test passed!');
    process.exit(0);
  } else {
    console.log('\n💥 Clubs navigation test failed!');
    process.exit(1);
  }
}).catch(error => {
  console.error('💥 Test runner failed:', error);
  process.exit(1);
}); 