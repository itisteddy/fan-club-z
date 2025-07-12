#!/usr/bin/env node

/**
 * Quick test script to verify demo login fixes
 * Run this to check if rate limiting and mobile navigation issues are resolved
 */

const { chromium } = require('playwright');

async function testDemoLoginFixes() {
  console.log('🔧 Testing demo login fixes...');
  
  const browser = await chromium.launch({ 
    headless: false, 
    args: ['--disable-web-security', '--disable-features=VizDisplayCompositor']
  });
  
  try {
    // Test 1: Desktop browser
    console.log('\n📱 Testing on desktop browser...');
    const desktopPage = await browser.newPage();
    await testDemoLogin(desktopPage, 'desktop');
    
    // Test 2: Mobile browser simulation
    console.log('\n📱 Testing on mobile browser simulation...');
    const mobilePage = await browser.newPage();
    await mobilePage.setViewportSize({ width: 375, height: 667 });
    await mobilePage.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1');
    await testDemoLogin(mobilePage, 'mobile');
    
    // Test 3: Rapid demo login attempts (rate limiting test)
    console.log('\n🚀 Testing rapid demo login attempts (rate limiting)...');
    await testRateLimiting(browser);
    
    console.log('\n✅ All tests completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
}

async function testDemoLogin(page, deviceType) {
  try {
    console.log(`  🌐 Navigating to http://localhost:3000 (${deviceType})...`);
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    
    console.log(`  🔍 Looking for Welcome text (${deviceType})...`);
    await page.locator('text=Welcome to Fan Club Z').waitFor({ timeout: 10000 });
    
    console.log(`  🔍 Looking for Try Demo button (${deviceType})...`);
    const demoButton = page.locator('button:has-text("Try Demo")');
    await demoButton.waitFor({ timeout: 5000 });
    
    console.log(`  🖱️ Clicking Try Demo button (${deviceType})...`);
    await demoButton.click();
    
    console.log(`  ⏳ Waiting for navigation (${deviceType})...`);
    await page.waitForFunction(() => !window.location.pathname.startsWith('/auth'), { timeout: 15000 });
    
    console.log(`  🔍 Looking for bottom navigation (${deviceType})...`);
    const bottomNav = page.locator('[data-testid="bottom-navigation"]');
    await bottomNav.waitFor({ timeout: 15000 });
    
    console.log(`  🔍 Verifying navigation buttons (${deviceType})...`);
    const buttonCount = await bottomNav.locator('button').count();
    if (buttonCount === 0) {
      throw new Error(`No navigation buttons found on ${deviceType}`);
    }
    
    console.log(`  🔍 Looking for Discover tab (${deviceType})...`);
    await page.locator('text=Discover').waitFor({ timeout: 5000 });
    
    console.log(`  ✅ Demo login successful on ${deviceType}! (${buttonCount} nav buttons found)`);
    
  } catch (error) {
    console.error(`  ❌ Demo login failed on ${deviceType}:`, error.message);
    await page.screenshot({ path: `demo-login-failed-${deviceType}.png`, fullPage: true });
    throw error;
  }
}

async function testRateLimiting(browser) {
  const promises = [];
  
  // Create 5 concurrent demo login attempts
  for (let i = 0; i < 5; i++) {
    promises.push(async () => {
      const page = await browser.newPage();
      try {
        console.log(`    🚀 Attempt ${i + 1}: Starting demo login...`);
        await page.goto('http://localhost:3000');
        await page.waitForLoadState('networkidle');
        
        const demoButton = page.locator('button:has-text("Try Demo")');
        await demoButton.waitFor({ timeout: 5000 });
        await demoButton.click();
        
        // Check if we get rate limited
        const errorText = await page.locator('text=Too many').isVisible({ timeout: 3000 }).catch(() => false);
        if (errorText) {
          console.log(`    ❌ Attempt ${i + 1}: Got rate limited!`);
          return false;
        }
        
        // Check if login succeeded
        await page.waitForFunction(() => !window.location.pathname.startsWith('/auth'), { timeout: 10000 });
        console.log(`    ✅ Attempt ${i + 1}: Demo login successful (no rate limiting)`);
        return true;
      } catch (error) {
        console.log(`    ⚠️ Attempt ${i + 1}: ${error.message}`);
        return false;
      } finally {
        await page.close();
      }
    });
  }
  
  // Execute all attempts concurrently
  const results = await Promise.all(promises.map(fn => fn()));
  const successCount = results.filter(Boolean).length;
  
  console.log(`  📊 Rate limiting test results: ${successCount}/5 attempts succeeded`);
  
  if (successCount >= 4) {
    console.log(`  ✅ Rate limiting bypass working correctly!`);
  } else {
    throw new Error(`Rate limiting not properly bypassed: only ${successCount}/5 attempts succeeded`);
  }
}

// Check if server is running first
async function checkServer() {
  try {
    const response = await fetch('http://localhost:3000');
    return response.ok;
  } catch {
    return false;
  }
}

async function main() {
  console.log('🔍 Checking if development server is running...');
  
  const serverRunning = await checkServer();
  if (!serverRunning) {
    console.error('❌ Development server is not running on http://localhost:3000');
    console.log('💡 Please start the server first with: npm run dev');
    process.exit(1);
  }
  
  console.log('✅ Development server is running');
  await testDemoLoginFixes();
}

main().catch(console.error);
