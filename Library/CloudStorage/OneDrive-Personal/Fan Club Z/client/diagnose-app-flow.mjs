import { chromium } from 'playwright';

async function diagnoseAppFlow() {
  console.log('🔍 Comprehensive App Flow Diagnosis...\n');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 1000 // Slow down for debugging
  });
  const page = await browser.newPage();
  
  // Capture all console messages and errors
  page.on('console', msg => {
    console.log(`📟 BROWSER CONSOLE [${msg.type()}]:`, msg.text());
  });
  
  page.on('pageerror', error => {
    console.error('🚨 PAGE ERROR:', error.message);
  });
  
  page.on('requestfailed', request => {
    console.error('🌐 FAILED REQUEST:', request.url(), request.failure()?.errorText);
  });
  
  try {
    // Step 1: Check if app loads at all
    console.log('1️⃣ Attempting to load http://localhost:3000...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 15000 });
    console.log('✅ Page loaded successfully');
    
    // Take screenshot of what loaded
    await page.screenshot({ path: 'diagnosis-step1-loaded.png', fullPage: true });
    console.log('📸 Screenshot saved: diagnosis-step1-loaded.png');
    
    // Step 2: Check page title and basic content
    const title = await page.title();
    console.log('📄 Page title:', title);
    
    const bodyText = await page.locator('body').textContent();
    console.log('📝 Page contains text:', bodyText?.substring(0, 200) + '...');
    
    // Step 3: Look for specific elements
    console.log('\n2️⃣ Checking for login page elements...');
    
    const welcomeText = await page.locator('text=Welcome to Fan Club Z').isVisible();
    console.log('🎯 "Welcome to Fan Club Z" visible:', welcomeText);
    
    const demoButton = await page.locator('button:has-text("Try Demo")').isVisible();
    console.log('🎯 "Try Demo" button visible:', demoButton);
    
    const signInButton = await page.locator('button:has-text("Sign In")').isVisible();
    console.log('🎯 "Sign In" button visible:', signInButton);
    
    if (!demoButton) {
      console.log('⚠️ Demo button not found! Looking for alternative selectors...');
      
      // Check for any buttons at all
      const buttons = await page.locator('button').count();
      console.log('🔢 Total buttons found:', buttons);
      
      if (buttons > 0) {
        console.log('📝 Button texts found:');
        for (let i = 0; i < Math.min(buttons, 5); i++) {
          const buttonText = await page.locator('button').nth(i).textContent();
          console.log(`  Button ${i}: "${buttonText}"`);
        }
      }
      
      // Check for any text containing "demo"
      const demoTexts = await page.locator('text=/demo/i').count();
      console.log('🔍 Elements with "demo" text:', demoTexts);
    }
    
    // Step 4: If demo button exists, try clicking it
    if (demoButton) {
      console.log('\n3️⃣ Attempting demo login...');
      await page.locator('button:has-text("Try Demo")').click();
      console.log('✅ Demo button clicked');
      
      // Wait a bit and see what happens
      await page.waitForTimeout(3000);
      
      const currentUrl = page.url();
      console.log('📍 URL after demo click:', currentUrl);
      
      // Take screenshot after demo login
      await page.screenshot({ path: 'diagnosis-step3-after-demo.png', fullPage: true });
      console.log('📸 Screenshot saved: diagnosis-step3-after-demo.png');
      
      // Check for bottom navigation
      const bottomNav = await page.locator('[data-testid="bottom-navigation"]').isVisible();
      console.log('🧭 Bottom navigation visible:', bottomNav);
      
      if (bottomNav) {
        // Check for clubs tab
        const clubsTab = await page.locator('[data-testid="nav-clubs"]').isVisible();
        console.log('🏛️ Clubs tab visible:', clubsTab);
        
        if (clubsTab) {
          console.log('\n4️⃣ Attempting to navigate to clubs...');
          await page.locator('[data-testid="nav-clubs"]').click();
          await page.waitForTimeout(2000);
          
          const clubsUrl = page.url();
          console.log('📍 URL after clubs click:', clubsUrl);
          
          // Take screenshot of clubs page
          await page.screenshot({ path: 'diagnosis-step4-clubs.png', fullPage: true });
          console.log('📸 Screenshot saved: diagnosis-step4-clubs.png');
          
          // Check for clubs header
          const clubsHeader = await page.locator('header h1:has-text("Clubs")').isVisible();
          console.log('🏛️ Clubs header visible:', clubsHeader);
          
          // Check for tabs
          const discoverTab = await page.locator('[role="tab"]:has-text("Discover")').isVisible();
          console.log('🔍 Discover tab visible:', discoverTab);
          
          // Check for categories
          const allCategory = await page.locator('[data-testid="category-all"]').isVisible();
          console.log('🏷️ All category visible:', allCategory);
          
          // Check for club cards
          const clubCards = await page.locator('[data-testid="club-card"]').count();
          console.log('🏛️ Club cards found:', clubCards);
          
          console.log('\n✅ CLUBS DIAGNOSIS COMPLETED SUCCESSFULLY!');
          return true;
        } else {
          console.log('❌ Clubs tab not found in bottom navigation');
        }
      } else {
        console.log('❌ Bottom navigation not found after demo login');
        
        // Check what's actually on the page
        const pageContent = await page.locator('body').textContent();
        console.log('📝 Page content after demo login:', pageContent?.substring(0, 300));
      }
    } else {
      console.log('❌ Demo button not found - cannot proceed with login');
    }
    
    return false;
    
  } catch (error) {
    console.error('💥 Error during diagnosis:', error.message);
    
    // Take screenshot of error state
    await page.screenshot({ path: 'diagnosis-error.png', fullPage: true });
    console.log('📸 Error screenshot saved: diagnosis-error.png');
    
    return false;
  } finally {
    console.log('\n⏸️ Keeping browser open for manual inspection...');
    console.log('Close the browser manually when done inspecting.');
    // Don't close browser automatically so you can inspect
    // await browser.close();
  }
}

diagnoseAppFlow().then(success => {
  if (success) {
    console.log('\n🎉 App flow is working correctly!');
  } else {
    console.log('\n⚠️ App flow has issues that need to be addressed.');
  }
}).catch(error => {
  console.error('💥 Diagnosis failed:', error);
});
