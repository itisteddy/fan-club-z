import { chromium } from '@playwright/test';

async function debugNavigation() {
  console.log('🔍 Debugging Navigation Issues...\n');
  
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Navigate to app
    console.log('📱 Loading app...');
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Login process
    console.log('\n🔐 Step 1: Login process');
    await page.click('button:has-text("Sign In")');
    await page.waitForTimeout(1000);
    
    await page.fill('input[placeholder="Enter your email"]', 'demo@fanclubz.app');
    await page.fill('input[placeholder="Enter your password"]', 'demo123');
    await page.click('button:has-text("Sign In")');
    await page.waitForTimeout(3000);
    
    // Check if login was successful
    const isAuthenticated = await page.evaluate(() => {
      return localStorage.getItem('auth_token') !== null;
    });
    
    console.log(`   Is authenticated: ${isAuthenticated}`);
    
    // Wait for page to fully load after login
    await page.waitForTimeout(2000);
    
    // Check current URL
    const currentUrl = page.url();
    console.log(`\n📍 Current URL: ${currentUrl}`);
    
    // Check what's actually on the page
    console.log('\n🔍 Step 2: Page content analysis');
    
    // Get all text content
    const pageText = await page.evaluate(() => {
      return document.body.innerText;
    });
    console.log('   Page text content:');
    console.log('   ' + pageText.substring(0, 500) + '...');
    
    // Check if we're on onboarding/compliance page
    const isOnboarding = pageText.includes('Privacy Policy') || pageText.includes('Terms of Service') || pageText.includes('Responsible Gambling');
    
    if (isOnboarding) {
      console.log('\n📋 Step 3: Onboarding flow detected');
      console.log('   User is in compliance onboarding - need to complete this first');
      
      // Look for continue button
      const continueButton = await page.locator('text=Continue to Privacy Policy').count();
      if (continueButton > 0) {
        console.log('   ✅ Found "Continue to Privacy Policy" button');
        
        // Click through the onboarding
        console.log('   Clicking through onboarding...');
        await page.click('text=Continue to Privacy Policy');
        await page.waitForTimeout(2000);
        
        // Check if we're now on the main app
        const newUrl = page.url();
        console.log(`   New URL: ${newUrl}`);
        
        const newPageText = await page.evaluate(() => {
          return document.body.innerText;
        });
        
        if (newPageText.includes('Discover') || newPageText.includes('My Bets')) {
          console.log('   ✅ Successfully completed onboarding - now on main app');
        } else {
          console.log('   ❌ Still in onboarding flow');
        }
      } else {
        console.log('   ❌ Continue button not found');
      }
    } else {
      console.log('\n🧭 Step 3: Navigation elements search');
      
      // Look for any elements with navigation-related classes
      const navElements = await page.evaluate(() => {
        const elements = document.querySelectorAll('*');
        const navRelated = [];
        
        for (let el of elements) {
          const className = String(el.className || '');
          const tagName = el.tagName.toLowerCase();
          
          if (className.includes('nav') || 
              className.includes('bottom') || 
              className.includes('fixed') ||
              tagName === 'nav') {
            navRelated.push({
              tag: tagName,
              class: className,
              text: el.textContent?.substring(0, 50) || '',
              visible: el.offsetParent !== null
            });
          }
        }
        
        return navRelated;
      });
      
      console.log('   Navigation-related elements found:');
      navElements.forEach((el, i) => {
        console.log(`   ${i + 1}. <${el.tag}> class="${el.class}" visible=${el.visible} text="${el.text}"`);
      });
      
      // Check for any buttons
      console.log('\n🔘 Step 4: Button elements search');
      
      const buttons = await page.evaluate(() => {
        const buttonElements = document.querySelectorAll('button');
        return Array.from(buttonElements).map(btn => ({
          text: btn.textContent?.trim() || '',
          class: btn.className || '',
          visible: btn.offsetParent !== null
        }));
      });
      
      console.log('   Button elements found:');
      buttons.forEach((btn, i) => {
        console.log(`   ${i + 1}. "${btn.text}" class="${btn.class}" visible=${btn.visible}`);
      });
      
      // Check for any divs with fixed positioning
      console.log('\n📌 Step 5: Fixed positioned elements');
      
      const fixedElements = await page.evaluate(() => {
        const elements = document.querySelectorAll('*');
        const fixed = [];
        
        for (let el of elements) {
          const style = window.getComputedStyle(el);
          if (style.position === 'fixed') {
            fixed.push({
              tag: el.tagName.toLowerCase(),
              class: el.className || '',
              text: el.textContent?.substring(0, 50) || '',
              bottom: style.bottom,
              top: style.top
            });
          }
        }
        
        return fixed;
      });
      
      console.log('   Fixed positioned elements:');
      fixedElements.forEach((el, i) => {
        console.log(`   ${i + 1}. <${el.tag}> class="${el.class}" bottom="${el.bottom}" top="${el.top}" text="${el.text}"`);
      });
    }
    
    // Check if BottomNavigation component is imported and rendered
    console.log('\n🔧 Step 6: React component check');
    
    const reactComponents = await page.evaluate(() => {
      // Try to access React DevTools if available
      if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
        return 'React DevTools available';
      }
      return 'React DevTools not available';
    });
    
    console.log(`   ${reactComponents}`);
    
    // Take a screenshot for visual debugging
    console.log('\n📸 Step 6: Taking screenshot');
    await page.screenshot({ path: 'debug-navigation.png', fullPage: true });
    console.log('   Screenshot saved as debug-navigation.png');
    
  } catch (error) {
    console.log('❌ Debug error:', error.message);
  } finally {
    await context.close();
    await browser.close();
  }
  
  console.log('\n🎯 Navigation debugging complete!');
}

debugNavigation().catch(console.error); 