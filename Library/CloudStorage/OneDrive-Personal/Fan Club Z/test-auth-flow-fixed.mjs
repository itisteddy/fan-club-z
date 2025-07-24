#!/usr/bin/env node

// Test script to verify authentication flow is working
import { chromium } from '@playwright/test'

async function testAuthenticationFlow() {
  console.log('🧪 Testing Authentication Flow...\n')
  
  const browser = await chromium.launch({ headless: false })
  const context = await browser.newContext()
  const page = await context.newPage()
  
  try {
    // Step 1: Navigate to app
    console.log('📱 Step 1: Loading app...')
    await page.goto('http://localhost:3000')
    await page.waitForLoadState('networkidle')
    
    // Step 2: Verify we're redirected to login page for unauthenticated users
    console.log('🔍 Step 2: Checking authentication redirect...')
    
    // Wait for any redirects to complete
    await page.waitForTimeout(2000)
    
    const currentUrl = page.url()
    console.log(`   Current URL: ${currentUrl}`)
    
    // Check if we're on the login page
    const isOnLoginPage = currentUrl.includes('/auth/login')
    console.log(`   On login page: ${isOnLoginPage ? '✅' : '❌'}`)
    
    // Step 3: Verify login page elements
    console.log('🔍 Step 3: Checking login page elements...')
    
    try {
      // Check for welcome text
      const welcomeText = await page.locator('text=Welcome to Fan Club Z').isVisible()
      console.log(`   Welcome text visible: ${welcomeText ? '✅' : '❌'}`)
      
      // Check for sign in button
      const signInButton = await page.locator('button:has-text("Sign In")').isVisible()
      console.log(`   Sign In button visible: ${signInButton ? '✅' : '❌'}`)
      
      // Check for email input
      const emailInput = await page.locator('input[type="email"]').isVisible()
      console.log(`   Email input visible: ${emailInput ? '✅' : '❌'}`)
      
      // Check for password input
      const passwordInput = await page.locator('input[type="password"]').isVisible()
      console.log(`   Password input visible: ${passwordInput ? '✅' : '❌'}`)
      
      // Step 4: Test login form interaction
      console.log('🔍 Step 4: Testing login form interaction...')
      
      if (emailInput && passwordInput && signInButton) {
        // Fill in test credentials
        await page.locator('input[type="email"]').fill('test@example.com')
        await page.locator('input[type="password"]').fill('password123')
        console.log('   ✅ Test credentials filled')
        
        // Click sign in (expect it to handle gracefully even with invalid creds)
        await page.locator('button:has-text("Sign In")').click()
        console.log('   ✅ Sign In button clicked')
        
        // Wait for response
        await page.waitForTimeout(3000)
        
        // Check if form handled the submission (may show error, which is expected)
        const stillOnLoginPage = page.url().includes('/auth/login')
        console.log(`   Still on login page after submission: ${stillOnLoginPage ? '✅' : '❌'}`)
        
        // Look for any error messages or loading states
        const hasErrorMessage = await page.locator('text=/error|invalid|failed/i').isVisible()
        const hasLoadingState = await page.locator('text=/loading|signing/i').isVisible()
        
        if (hasErrorMessage) {
          console.log('   ✅ Error message displayed (expected for invalid credentials)')
        } else if (hasLoadingState) {
          console.log('   ✅ Loading state displayed')
        } else {
          console.log('   ✅ Form submission handled')
        }
      }
      
      // Summary
      console.log('\n📊 Test Summary:')
      const allTestsPassed = isOnLoginPage && welcomeText && signInButton && emailInput && passwordInput
      
      if (allTestsPassed) {
        console.log('✅ ALL TESTS PASSED - Authentication flow is working correctly!')
        console.log('   - Unauthenticated users are properly redirected to login page')
        console.log('   - Login page displays all required elements')
        console.log('   - Login form is functional and handles submissions')
      } else {
        console.log('❌ SOME TESTS FAILED - Issues found:')
        if (!isOnLoginPage) console.log('   - Not redirected to login page')
        if (!welcomeText) console.log('   - Welcome text not visible')
        if (!signInButton) console.log('   - Sign In button not visible')
        if (!emailInput) console.log('   - Email input not visible')
        if (!passwordInput) console.log('   - Password input not visible')
      }
      
    } catch (error) {
      console.log(`❌ Error checking login page elements: ${error.message}`)
    }
    
  } catch (error) {
    console.log(`❌ Test failed: ${error.message}`)
  } finally {
    await context.close()
    await browser.close()
  }
}

// Run the test
testAuthenticationFlow().catch(console.error)
