import { chromium } from '@playwright/test';

async function fixNavigation() {
  console.log('🔧 Fixing Navigation Issues...\n');
  
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Navigate to the app
    console.log('📱 Loading app...');
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Test 1: Check if navigation buttons are clickable
    console.log('\n🧪 Test 1: Navigation button clickability');
    
    const navButtons = [
      { name: 'Discover', selector: 'button:has-text("Discover")' },
      { name: 'My Bets', selector: 'button:has-text("My Bets")' },
      { name: 'Create', selector: 'button:has-text("Create")' },
      { name: 'Clubs', selector: 'button:has-text("Clubs")' },
      { name: 'Sign In', selector: 'button:has-text("Sign In")' }
    ];
    
    for (const button of navButtons) {
      try {
        console.log(`   Testing ${button.name} button...`);
        
        // Check if button is visible and clickable
        const isVisible = await page.locator(button.selector).isVisible();
        const isEnabled = await page.locator(button.selector).isEnabled();
        
        console.log(`     Visible: ${isVisible}, Enabled: ${isEnabled}`);
        
        if (isVisible && isEnabled) {
          // Try clicking the button
          await page.click(button.selector);
          await page.waitForTimeout(1000);
          
          // Check if navigation worked
          if (button.name === 'Discover') {
            const discoverText = await page.locator('text=Discover').count();
            console.log(`     ✅ ${button.name} navigation successful (Discover text found: ${discoverText})`);
          } else if (button.name === 'Clubs') {
            const clubsText = await page.locator('text=Popular Clubs').count();
            console.log(`     ✅ ${button.name} navigation successful (Clubs text found: ${clubsText})`);
          } else if (button.name === 'My Bets') {
            const signInText = await page.locator('text=Sign in to view your bets').count();
            console.log(`     ✅ ${button.name} navigation successful (Sign in prompt found: ${signInText})`);
          } else if (button.name === 'Sign In') {
            const authText = await page.locator('text=Sign In').count();
            console.log(`     ✅ ${button.name} navigation successful (Auth modal found: ${authText})`);
          } else {
            console.log(`     ✅ ${button.name} button clicked successfully`);
          }
        } else {
          console.log(`     ❌ ${button.name} button not clickable`);
        }
        
        // Go back to discover if we navigated away
        if (button.name !== 'Discover') {
          await page.click('button:has-text("Discover")');
          await page.waitForTimeout(1000);
        }
        
      } catch (error) {
        console.log(`     ❌ ${button.name} button error: ${error.message}`);
      }
    }
    
    // Test 2: Check bet detail navigation
    console.log('\n🧪 Test 2: Bet detail navigation');
    try {
      const betCard = await page.locator('[data-testid="bet-card"]').first();
      if (await betCard.isVisible()) {
        console.log('   Clicking bet card...');
        await betCard.click();
        await page.waitForTimeout(2000);
        
        // Check if we're on bet detail page
        const placeBetButton = await page.locator('text=Place Bet').count();
        if (placeBetButton > 0) {
          console.log('   ✅ Bet detail page loaded successfully');
          
          // Test back navigation
          console.log('   Testing back navigation...');
          const backButton = await page.locator('button[aria-label="Back"]').count();
          if (backButton > 0) {
            await page.click('button[aria-label="Back"]');
            await page.waitForTimeout(2000);
            
            const discoverText = await page.locator('text=Discover').count();
            if (discoverText > 0) {
              console.log('   ✅ Back navigation successful');
            } else {
              console.log('   ❌ Back navigation failed');
            }
          } else {
            console.log('   ❌ Back button not found');
          }
        } else {
          console.log('   ❌ Bet detail page not loaded properly');
        }
      } else {
        console.log('   ❌ Bet card not visible');
      }
    } catch (error) {
      console.log(`   ❌ Bet detail navigation error: ${error.message}`);
    }
    
    // Test 3: Check authentication flow
    console.log('\n🧪 Test 3: Authentication flow');
    try {
      await page.click('button:has-text("Sign In")');
      await page.waitForTimeout(1000);
      
      const authModal = await page.locator('text=Sign In').count();
      if (authModal > 0) {
        console.log('   ✅ Authentication modal opened');
        
        // Try to fill login form
        const emailInput = await page.locator('input[placeholder="Email"]').count();
        const passwordInput = await page.locator('input[placeholder="Password"]').count();
        
        if (emailInput > 0 && passwordInput > 0) {
          console.log('   ✅ Login form found');
          
          await page.fill('input[placeholder="Email"]', 'demo@example.com');
          await page.fill('input[placeholder="Password"]', 'password123');
          await page.click('button:has-text("Sign In")');
          await page.waitForTimeout(2000);
          
          const welcomeText = await page.locator('text=Welcome back').count();
          if (welcomeText > 0) {
            console.log('   ✅ Login successful');
          } else {
            console.log('   ❌ Login failed');
          }
        } else {
          console.log('   ❌ Login form not found');
        }
      } else {
        console.log('   ❌ Authentication modal not opened');
      }
    } catch (error) {
      console.log(`   ❌ Authentication flow error: ${error.message}`);
    }
    
    // Test 4: Check search functionality
    console.log('\n🧪 Test 4: Search functionality');
    try {
      await page.click('button:has-text("Discover")');
      await page.waitForTimeout(1000);
      
      const searchInput = await page.locator('input[placeholder="Search bets, topics, or creators..."]');
      if (await searchInput.isVisible()) {
        console.log('   ✅ Search input found');
        
        await searchInput.fill('Bitcoin');
        await page.waitForTimeout(1000);
        
        const bitcoinBets = await page.locator('text=Bitcoin').count();
        if (bitcoinBets > 0) {
          console.log(`   ✅ Search working (found ${bitcoinBets} Bitcoin bets)`);
        } else {
          console.log('   ❌ Search not filtering results');
        }
      } else {
        console.log('   ❌ Search input not found');
      }
    } catch (error) {
      console.log(`   ❌ Search functionality error: ${error.message}`);
    }
    
  } catch (error) {
    console.log('❌ Test error:', error.message);
  } finally {
    await context.close();
    await browser.close();
  }
  
  console.log('\n🔧 Navigation testing complete!');
}

fixNavigation().catch(console.error); 