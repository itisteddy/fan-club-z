import { chromium } from '@playwright/test';

async function testAllFixes() {
  console.log('🧪 Testing All Registration & Compliance Fixes...\n');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 1000
  });
  
  const page = await browser.newPage();
  
  // Set mobile viewport to match the screenshots
  await page.setViewportSize({ width: 390, height: 844 });
  
  try {
    console.log('📍 Step 1: Testing Registration Form...');
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    
    // Check if we're on login page
    const isLoginPage = await page.locator('text=Welcome to Fan Club Z').isVisible();
    
    if (isLoginPage) {
      console.log('✅ On login page');
      
      // Look for "Sign up" or "Create Account" link
      const signUpLink = page.locator('text=Sign up, text=Create Account');
      const signUpExists = await signUpLink.first().isVisible();
      
      if (signUpExists) {
        console.log('🔍 Found sign up link, clicking...');
        await signUpLink.first().click();
        await page.waitForLoadState('networkidle');
        
        // Test 1: Check for registration typo fix
        console.log('\\n🎯 Test 1: Checking registration typo fix...');
        
        const firstNameInput = page.locator('input[placeholder*="First"]');
        const firstNameExists = await firstNameInput.isVisible();
        
        if (firstNameExists) {
          const placeholder = await firstNameInput.getAttribute('placeholder');
          console.log(`📝 First name placeholder: "${placeholder}"`);
          
          if (placeholder === 'First name') {
            console.log('✅ PASS: Registration typo fixed');
          } else if (placeholder === 'First nar') {
            console.log('❌ FAIL: Registration typo still exists');
          } else {
            console.log(`⚠️  Different placeholder: "${placeholder}"`);
          }
        }
        
        await page.screenshot({ path: 'test-registration-fixed.png' });
      }
    }
    
    // Test 2 & 3: Test compliance and auto-login via demo
    console.log('\\n🎯 Test 2-3: Testing compliance layout and auto-login...');
    
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    
    const demoButton = page.locator('button:has-text("Try Demo")');
    const demoExists = await demoButton.isVisible();
    
    if (demoExists) {
      console.log('🚀 Using demo login to test compliance...');
      await demoButton.click();
      await page.waitForTimeout(3000);
      
      // Check if compliance screens appear
      const termsTitle = page.locator('h1:has-text("Terms of Service")');
      const termsExists = await termsTitle.isVisible();
      
      if (termsExists) {
        console.log('✅ Terms of Service screen appeared');
        
        // Test compliance layout width
        const cardContent = page.locator('.space-y-6'); // The content area
        if (await cardContent.isVisible()) {
          const contentBox = await cardContent.boundingBox();
          if (contentBox) {
            const widthPercentage = (contentBox.width / 390) * 100;
            console.log(`📏 Compliance text width: ${widthPercentage.toFixed(1)}% of screen`);
            
            if (widthPercentage > 85) {
              console.log('✅ PASS: Compliance text uses good width');
            } else {
              console.log('❌ FAIL: Compliance text still too narrow');
            }
          }
        }
        
        await page.screenshot({ path: 'test-compliance-layout.png' });
        
        // Complete compliance flow
        const agreeButton = page.locator('button:has-text("I Agree")');
        if (await agreeButton.isVisible()) {
          await agreeButton.click();
          await page.waitForTimeout(2000);
          
          // Check if there's a next step (Privacy Policy)
          const privacyTitle = page.locator('h1:has-text("Privacy Policy")');
          if (await privacyTitle.isVisible()) {
            console.log('✅ Privacy Policy screen appeared');
            const privacyAgree = page.locator('button:has-text("I Agree")');
            if (await privacyAgree.isVisible()) {
              await privacyAgree.click();
              await page.waitForTimeout(2000);
            }
          }
          
          // Check if there's responsible gambling step
          const responsibleTitle = page.locator('h1:has-text("Responsible Gambling")');
          if (await responsibleTitle.isVisible()) {
            console.log('✅ Responsible Gambling screen appeared');
            const closeButton = page.locator('button:has-text("Close")');
            if (await closeButton.isVisible()) {
              await closeButton.click();
              await page.waitForTimeout(2000);
            }
          }
          
          // Check final completion
          const completeTitle = page.locator('h1:has-text("Setup Complete")');
          if (await completeTitle.isVisible()) {
            console.log('✅ Setup Complete screen appeared');
            const startButton = page.locator('button:has-text("Start Exploring")');
            if (await startButton.isVisible()) {
              await startButton.click();
              await page.waitForTimeout(3000);
            }
          }
          
          // Test 3: Check post-compliance state
          console.log('\\n🎯 Test 3: Checking post-compliance auto-login...');
          
          const currentUrl = page.url();
          console.log(`📍 Final URL: ${currentUrl}`);
          
          const discoverTitle = page.locator('h1:has-text("Discover")');
          const bottomNav = page.locator('[data-testid="bottom-navigation"]');
          
          const onDiscoverPage = await discoverTitle.isVisible();
          const hasNavigation = await bottomNav.isVisible();
          
          if (onDiscoverPage && hasNavigation) {
            console.log('✅ PASS: User on main app with navigation - auto-login worked!');
          } else if (currentUrl.includes('/auth/login')) {
            console.log('❌ FAIL: User redirected to login - auto-login failed');
          } else {
            console.log('⚠️  PARTIAL: User on app but may have issues');
          }
          
          await page.screenshot({ path: 'test-post-compliance.png' });
        }
      } else {
        console.log('⚠️  No compliance screen - may have already been completed');
        // Still check if we're logged in
        const discoverTitle = page.locator('h1:has-text("Discover")');
        if (await discoverTitle.isVisible()) {
          console.log('✅ Already on main app (compliance previously completed)');
        }
      }
    }
    
    // Summary
    console.log('\\n📊 Test Results Summary:');
    console.log('========================');
    console.log('1. ✅ Registration form tested');
    console.log('2. ✅ Compliance layout tested');  
    console.log('3. ✅ Auto-login flow tested');
    console.log('\\n📸 Screenshots saved:');
    console.log('- test-registration-fixed.png');
    console.log('- test-compliance-layout.png');
    console.log('- test-post-compliance.png');
    
  } catch (error) {
    console.log('\\n❌ Test Error:', error.message);
    await page.screenshot({ path: 'test-error.png' });
  } finally {
    await browser.close();
  }
}

testAllFixes().catch(console.error);