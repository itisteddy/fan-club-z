import { chromium } from '@playwright/test';

async function testRegistrationAndComplianceFixes() {
  console.log('🧪 Testing Registration & Compliance Fixes...\n');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 1000
  });
  
  const page = await browser.newPage();
  
  // Set mobile viewport to match the screenshots
  await page.setViewportSize({ width: 390, height: 844 });
  
  try {
    console.log('📍 Step 1: Navigate to app and test registration form...');
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    
    // Check if we're on login page
    const isLoginPage = await page.locator('text=Welcome to Fan Club Z').isVisible();
    
    if (isLoginPage) {
      console.log('✅ On login page');
      
      // Look for registration link or create account option
      const createAccountLink = page.locator('text=Create Account, text=Sign Up, text=Register');
      const createAccountExists = await createAccountLink.first().isVisible();
      
      if (createAccountExists) {
        console.log('🔍 Found create account option, clicking...');
        await createAccountLink.first().click();
        await page.waitForLoadState('networkidle');
        
        // Test 1: Check for registration typo fix
        console.log('\\n🔍 Test 1: Checking for registration typo fix...');
        
        const firstNameInput = page.locator('input[placeholder*="First"]');
        const firstNameExists = await firstNameInput.isVisible();
        
        if (firstNameExists) {
          const placeholder = await firstNameInput.getAttribute('placeholder');
          console.log(`📝 First name input placeholder: "${placeholder}"`);
          
          if (placeholder && placeholder.includes('First name')) {
            console.log('✅ PASS: Registration typo fixed - shows "First name"');
          } else if (placeholder && placeholder.includes('First nar')) {
            console.log('❌ FAIL: Registration typo still exists - shows "First nar"');
          } else {
            console.log('⚠️  WARNING: Unexpected placeholder text');
          }
        } else {
          console.log('❌ First name input not found');
        }
        
        // Take screenshot of registration form
        await page.screenshot({ 
          path: 'test-registration-form-fixed.png',
          fullPage: true 
        });
        console.log('📸 Registration form screenshot saved');
      }
    }
    
    // Test 2: Test compliance screens (use demo login to get there)
    console.log('\\n🔍 Test 2: Testing compliance screen layout...');
    
    // Go back to login and use demo login to trigger compliance
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    
    const demoButton = page.locator('button:has-text("Try Demo")');
    const demoExists = await demoButton.isVisible();
    
    if (demoExists) {
      console.log('🚀 Using demo login to test compliance flow...');
      await demoButton.click();
      await page.waitForTimeout(2000);
      
      // Check if compliance screen appears
      const complianceTitle = page.locator('h1:has-text("Terms of Service")');
      const complianceExists = await complianceTitle.isVisible();
      
      if (complianceExists) {
        console.log('✅ Compliance screen appeared');
        
        // Test compliance screen layout
        const contentArea = page.locator('.prose, [class*="prose"]');
        const contentExists = await contentArea.isVisible();
        
        if (contentExists) {
          // Check the styling and layout
          const contentBox = await contentArea.boundingBox();
          const viewportWidth = 390; // Our test viewport width
          
          if (contentBox) {
            const contentWidth = contentBox.width;
            const widthPercentage = (contentWidth / viewportWidth) * 100;
            
            console.log(`📏 Content area width: ${contentWidth}px (${widthPercentage.toFixed(1)}% of viewport)`);
            
            if (widthPercentage > 85) {
              console.log('✅ PASS: Compliance text uses good width (>85% of screen)');
            } else {
              console.log('❌ FAIL: Compliance text still too narrow (<85% of screen)');
            }
          }
        }
        
        // Take screenshot of compliance screen
        await page.screenshot({ 
          path: 'test-compliance-layout-fixed.png',
          fullPage: true 
        });
        console.log('📸 Compliance screen screenshot saved');
        
        // Test 3: Complete compliance and check auto-login
        console.log('\\n🔍 Test 3: Testing post-compliance auto-login...');
        
        const agreeButton = page.locator('button:has-text("I Agree")');
        const agreeExists = await agreeButton.isVisible();
        
        if (agreeExists) {
          console.log('✅ Found "I Agree" button, clicking...');
          await agreeButton.click();
          await page.waitForTimeout(3000);
          
          // Check where we end up
          const currentUrl = page.url();
          console.log(`📍 URL after compliance: ${currentUrl}`);
          
          // Check if we're on the main app (discover page)
          const discoverTitle = page.locator('h1:has-text("Discover")');
          const discoverExists = await discoverTitle.isVisible();
          
          // Check if bottom navigation is visible (sign of being logged in)
          const bottomNav = page.locator('[data-testid="bottom-navigation"]');
          const navExists = await bottomNav.isVisible();
          
          if (discoverExists && navExists) {
            console.log('✅ PASS: User is on main app with navigation - auto-login worked!');
          } else if (currentUrl.includes('/auth/login')) {
            console.log('❌ FAIL: User redirected to login page - auto-login failed');
          } else {
            console.log('⚠️  WARNING: Unexpected state after compliance');
          }
          
          // Take final screenshot
          await page.screenshot({ 
            path: 'test-post-compliance-state.png',
            fullPage: true 
          });
          console.log('📸 Post-compliance screenshot saved');
        }
      } else {
        console.log('❌ Compliance screen did not appear - may have already been completed');
      }
    }
    
    // Summary
    console.log('\\n📊 Test Summary:');
    console.log('================');
    console.log('1. Registration typo fix - Check screenshot: test-registration-form-fixed.png');
    console.log('2. Compliance layout fix - Check screenshot: test-compliance-layout-fixed.png'); 
    console.log('3. Auto-login after compliance - Check screenshot: test-post-compliance-state.png');
    console.log('\\n🔧 If any issues found, refer to REGISTRATION_COMPLIANCE_FIXES.md for solutions');
    
  } catch (error) {
    console.log('\\n❌ Test Error:', error.message);
    await page.screenshot({ path: 'test-error-screenshot.png', fullPage: true });
  } finally {
    await browser.close();
  }
}

// Run the test
testRegistrationAndComplianceFixes().catch(console.error);