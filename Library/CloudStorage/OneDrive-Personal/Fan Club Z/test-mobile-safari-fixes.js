#!/usr/bin/env node

/**
 * Mobile Safari specific test script
 * Tests the demo login fixes for Mobile Safari rate limiting and navigation issues
 */

const { webkit } = require('playwright');

async function testMobileSafariFixes() {
  console.log('📱 Testing Mobile Safari demo login fixes...');
  
  const browser = await webkit.launch({ 
    headless: false,
    args: ['--disable-web-security']
  });
  
  try {
    // Test 1: Mobile Safari simulation with multiple rapid attempts
    console.log('\n🔥 Testing rapid Mobile Safari demo login attempts...');
    
    const promises = [];
    for (let i = 0; i < 3; i++) {
      promises.push(testMobileSafariLogin(browser, i + 1));
    }
    
    const results = await Promise.allSettled(promises);
    const successes = results.filter(r => r.status === 'fulfilled').length;
    const failures = results.filter(r => r.status === 'rejected').length;
    
    console.log(`\n📊 Mobile Safari test results:`);
    console.log(`  ✅ Successful logins: ${successes}/3`);
    console.log(`  ❌ Failed logins: ${failures}/3`);
    
    if (successes >= 2) {
      console.log('🎉 Mobile Safari rate limiting fixes working!');
    } else {
      console.log('⚠️ Mobile Safari rate limiting fixes may need more work');
    }
    
  } catch (error) {
    console.error('\n❌ Mobile Safari test failed:', error.message);
  } finally {
    await browser.close();
  }
}

async function testMobileSafariLogin(browser, attemptNumber) {
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    viewport: { width: 375, height: 667 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true
  });
  
  const page = await context.newPage();
  
  try {
    console.log(`  🚀 Attempt ${attemptNumber}: Starting Mobile Safari demo login...`);
    
    // Navigate to app
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    
    // Look for welcome text
    await page.locator('text=Welcome to Fan Club Z').waitFor({ timeout: 15000 });
    console.log(`  📱 Attempt ${attemptNumber}: Login page loaded`);
    
    // Find and click demo button
    const demoButton = page.locator('button:has-text("Try Demo")');
    await demoButton.waitFor({ timeout: 8000 });
    
    // Ensure button is in view for mobile
    await demoButton.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    
    await demoButton.click();
    console.log(`  🖱️ Attempt ${attemptNumber}: Demo button clicked`);
    
    // Wait for navigation with extended timeout
    await page.waitForFunction(() => !window.location.pathname.startsWith('/auth'), { timeout: 25000 });
    console.log(`  🔄 Attempt ${attemptNumber}: Navigated away from auth`);
    
    // Wait for bottom navigation with extended Mobile Safari timeout
    const bottomNav = page.locator('[data-testid="bottom-navigation"]');
    await bottomNav.waitFor({ timeout: 30000 });
    console.log(`  📱 Attempt ${attemptNumber}: Bottom navigation found`);
    
    // Verify navigation buttons
    const buttonCount = await bottomNav.locator('button').count();
    if (buttonCount === 0) {
      throw new Error(`No navigation buttons found on attempt ${attemptNumber}`);
    }
    
    // Check for Discover tab
    await page.locator('text=Discover').waitFor({ timeout: 10000 });
    console.log(`  ✅ Attempt ${attemptNumber}: Demo login successful! (${buttonCount} nav buttons)`);
    
    return true;
    
  } catch (error) {
    console.error(`  ❌ Attempt ${attemptNumber}: ${error.message}`);
    
    // Take screenshot on failure
    await page.screenshot({ 
      path: `mobile-safari-login-failed-attempt-${attemptNumber}.png`, 
      fullPage: true 
    });
    
    // Check if it's a rate limiting error
    const rateLimitError = await page.locator('text=Too many').isVisible({ timeout: 1000 }).catch(() => false);
    if (rateLimitError) {
      console.error(`  🚫 Attempt ${attemptNumber}: Rate limited!`);
    }
    
    throw error;
    
  } finally {
    await context.close();
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
  await testMobileSafariFixes();
}

main().catch(console.error);
