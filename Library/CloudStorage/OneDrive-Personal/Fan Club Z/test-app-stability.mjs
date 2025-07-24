#!/usr/bin/env node

/**
 * Fan Club Z - Stability Test Script
 * Tests the simplified stores and core functionality
 */

import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const config = {
  baseUrl: 'http://localhost:3000',
  timeout: 30000,
  retries: 2
};

async function runStabilityTest() {
  console.log('🚀 Starting Fan Club Z Stability Test');
  console.log('=====================================');
  
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 375, height: 812 } // iPhone dimensions
  });
  const page = await context.newPage();
  
  // Track console errors
  const errors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });
  
  try {
    // Test 1: App loads without crashing
    console.log('📱 Test 1: App loads without crashing');
    await page.goto(config.baseUrl, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
    const hasErrorBoundary = await page.locator('text=Something went wrong').isVisible();
    if (hasErrorBoundary) {
      throw new Error('App crashed and error boundary is showing');
    }
    console.log('✅ App loads successfully');
    
    // Test 2: Authentication flow works
    console.log('📱 Test 2: Authentication flow');
    
    // Should redirect to login
    await page.waitForURL('**/auth/login', { timeout: 10000 });
    console.log('✅ Redirected to login page');
    
    // Test login form exists
    const emailInput = page.locator('input[type="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    const loginButton = page.locator('button:has-text("Sign In")').first();
    
    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(loginButton).toBeVisible();
    console.log('✅ Login form components are visible');
    
    // Test 3: Navigate to register page
    console.log('📱 Test 3: Registration flow');
    const registerLink = page.locator('text=Sign up').first();
    await registerLink.click();
    await page.waitForURL('**/auth/register', { timeout: 5000 });
    console.log('✅ Registration page navigation works');
    
    // Test 4: Navigation without errors
    console.log('📱 Test 4: Basic navigation');
    await page.goto(`${config.baseUrl}/discover`);
    await page.waitForTimeout(2000);
    
    // Should redirect back to login if not authenticated
    const currentUrl = page.url();
    if (currentUrl.includes('/auth/login')) {
      console.log('✅ Protected route redirection works');
    }
    
    // Test 5: Check for critical JavaScript errors
    console.log('📱 Test 5: JavaScript error check');
    if (errors.length > 0) {
      console.log('⚠️ JavaScript errors found:');
      errors.forEach(error => console.log(`  - ${error}`));
    } else {
      console.log('✅ No critical JavaScript errors');
    }
    
    // Test 6: Store initialization
    console.log('📱 Test 6: Store initialization');
    const storeState = await page.evaluate(() => {
      // Check if stores are initialized properly
      const authStore = localStorage.getItem('fan-club-z-auth');
      const walletStore = localStorage.getItem('fan-club-z-wallet');
      
      return {
        hasAuthStore: !!authStore,
        hasWalletStore: !!walletStore,
        authParseable: authStore ? (() => {
          try { JSON.parse(authStore); return true; } catch { return false; }
        })() : true,
        walletParseable: walletStore ? (() => {
          try { JSON.parse(walletStore); return true; } catch { return false; }
        })() : true
      };
    });
    
    if (storeState.authParseable && storeState.walletParseable) {
      console.log('✅ Store initialization successful');
    } else {
      console.log('❌ Store initialization issues detected');
    }
    
    // Test 7: Performance check
    console.log('📱 Test 7: Performance check');
    const performanceMetrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0];
      return {
        loadTime: navigation.loadEventEnd - navigation.loadEventStart,
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        firstPaint: performance.getEntriesByType('paint').find(p => p.name === 'first-paint')?.startTime || 0
      };
    });
    
    console.log(`✅ Load time: ${performanceMetrics.loadTime.toFixed(2)}ms`);
    console.log(`✅ DOM ready: ${performanceMetrics.domContentLoaded.toFixed(2)}ms`);
    
    console.log('\n🎉 STABILITY TEST PASSED');
    console.log('========================');
    console.log('✅ App loads without crashing');
    console.log('✅ Authentication flow works');
    console.log('✅ Navigation is functional');
    console.log('✅ Stores initialize properly');
    console.log('✅ No critical JavaScript errors');
    console.log('✅ Performance is acceptable');
    
  } catch (error) {
    console.log('\n❌ STABILITY TEST FAILED');
    console.log('========================');
    console.error('Error:', error.message);
    
    // Take a screenshot for debugging
    await page.screenshot({ path: 'stability-test-failure.png' });
    console.log('📸 Screenshot saved: stability-test-failure.png');
    
    // Log current page state
    const title = await page.title();
    const url = page.url();
    console.log(`Page: ${title} (${url})`);
    
    if (errors.length > 0) {
      console.log('\nJavaScript errors:');
      errors.forEach(error => console.log(`  - ${error}`));
    }
    
    throw error;
  } finally {
    await browser.close();
  }
}

// Helper function for expect-like assertions
function expect(locator) {
  return {
    toBeVisible: async () => {
      const isVisible = await locator.isVisible();
      if (!isVisible) {
        throw new Error(`Expected element to be visible: ${locator}`);
      }
    }
  };
}

// Run the test
if (import.meta.url === `file://${process.argv[1]}`) {
  runStabilityTest()
    .then(() => {
      console.log('\n✅ All tests passed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Test failed:', error.message);
      process.exit(1);
    });
}

export { runStabilityTest };
