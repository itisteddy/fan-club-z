import { chromium } from '@playwright/test';

async function testBasicFunctionality() {
  console.log('🎯 Testing Basic Functionality...\n');
  
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Test 1: App loads
    console.log('📱 Test 1: App loads successfully');
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    const discoverText = await page.locator('text=Discover').count();
    if (discoverText > 0) {
      console.log('   ✅ App loaded successfully');
    } else {
      console.log('   ❌ App failed to load');
      return;
    }
    
    // Test 2: Backend API check
    console.log('\n🔌 Test 2: Backend API connectivity');
    try {
      const response = await page.evaluate(async () => {
        const res = await fetch('http://localhost:5001/api/bets/trending');
        return { status: res.status, ok: res.ok };
      });
      
      if (response.ok) {
        console.log('   ✅ Backend API is accessible');
      } else {
        console.log(`   ❌ Backend API error: ${response.status}`);
      }
    } catch (error) {
      console.log(`   ❌ Backend API connection failed: ${error.message}`);
    }
    
    // Test 3: Check if bet cards load
    console.log('\n🎲 Test 3: Bet cards loading');
    await page.waitForTimeout(3000); // Wait for API calls
    
    const betCards = await page.locator('[data-testid="bet-card"]').count();
    console.log(`   Found ${betCards} bet cards`);
    
    if (betCards > 0) {
      console.log('   ✅ Bet cards loaded successfully');
    } else {
      console.log('   ❌ No bet cards found');
    }
    
    // Test 4: Check authentication flow
    console.log('\n🔐 Test 4: Authentication flow');
    try {
      await page.click('button:has-text("Sign In")');
      await page.waitForTimeout(1000);
      
      const authPage = await page.locator('text=Welcome to Fan Club Z').count();
      if (authPage > 0) {
        console.log('   ✅ Authentication page opened');
        
        // Check if demo credentials are visible
        const demoText = await page.locator('text=Demo Account').count();
        if (demoText > 0) {
          console.log('   ✅ Demo account info visible');
          
          // Try demo login
          await page.click('button:has-text("Try Demo")');
          await page.waitForTimeout(1000);
          
          // Check if form was filled
          const emailValue = await page.locator('input[placeholder="Enter your email"]').inputValue();
          const passwordValue = await page.locator('input[placeholder="Enter your password"]').inputValue();
          
          console.log(`   Demo credentials filled: ${emailValue} / ${passwordValue ? '***' : 'empty'}`);
          
          if (emailValue === 'demo@fanclubz.app' && passwordValue) {
            console.log('   ✅ Demo login form filled correctly');
          } else {
            console.log('   ❌ Demo login form not filled correctly');
          }
        } else {
          console.log('   ❌ Demo account info not found');
        }
      } else {
        console.log('   ❌ Authentication page not opened');
      }
    } catch (error) {
      console.log(`   ❌ Authentication flow error: ${error.message}`);
    }
    
  } catch (error) {
    console.log('❌ Test error:', error.message);
  } finally {
    await context.close();
    await browser.close();
  }
  
  console.log('\n🎯 Basic functionality testing complete!');
}

testBasicFunctionality().catch(console.error); 