#!/usr/bin/env node

import { chromium } from 'playwright'

async function testRegistrationOnboardingFlow() {
  console.log('🧪 Testing Registration and Onboarding Flow...')
  
  const browser = await chromium.launch({ 
    headless: false, // Set to true for headless testing
    devtools: true 
  })
  const context = await browser.newContext()
  const page = await context.newPage()

  try {
    // Enable console logging
    page.on('console', msg => {
      if (msg.type() === 'log' || msg.type() === 'error') {
        console.log(`🔍 Browser: ${msg.text()}`)
      }
    })

    // Navigate to the app
    console.log('📱 Opening Fan Club Z...')
    await page.goto('http://localhost:5173')
    
    // Wait for app to load
    await page.waitForTimeout(2000)
    
    // Check if we're redirected to login
    console.log('🔍 Current URL:', page.url())
    
    // Navigate to registration
    console.log('📝 Navigating to registration...')
    if (page.url().includes('/auth/login')) {
      await page.click('text=Create Account')
    } else {
      await page.goto('http://localhost:5173/auth/register')
    }
    
    await page.waitForTimeout(1000)
    
    // Fill out registration form
    console.log('✏️ Filling registration form...')
    const timestamp = Date.now()
    const testEmail = `test${timestamp}@example.com`
    const testUsername = `testuser${timestamp}`
    
    await page.fill('#firstName', 'Test')
    await page.fill('#lastName', 'User')
    await page.fill('#username', testUsername)
    await page.fill('#email', testEmail)
    await page.fill('#phone', '1234567890')
    await page.fill('#password', 'TestPass123')
    await page.fill('#confirmPassword', 'TestPass123')
    await page.fill('#dateOfBirth', '1990-01-01')
    await page.check('input[type="checkbox"]')
    
    console.log('🚀 Submitting registration...')
    await page.click('button[type="submit"]')
    
    // Wait for registration to complete and check redirect
    await page.waitForTimeout(3000)
    console.log('🔍 After registration - URL:', page.url())
    
    // Should be redirected to onboarding
    if (page.url().includes('/onboarding')) {
      console.log('✅ Successfully redirected to onboarding')
      
      // Go through onboarding flow
      console.log('🎯 Starting onboarding flow...')
      
      // Click Get Started
      await page.click('text=Get Started')
      await page.waitForTimeout(1000)
      
      // Terms page - click I Agree
      await page.click('text=I Agree')
      await page.waitForTimeout(1000)
      
      // Privacy page - click I Agree
      await page.click('text=I Agree')
      await page.waitForTimeout(1000)
      
      // Responsible gambling - click Close
      await page.click('text=Close')
      await page.waitForTimeout(1000)
      
      // Complete onboarding
      console.log('🎉 Completing onboarding...')
      await page.click('text=Start Exploring')
      
      // Wait for redirect to discover
      await page.waitForTimeout(3000)
      console.log('🔍 After onboarding - URL:', page.url())
      
      // Check if we're on discover page and authenticated
      if (page.url().includes('/discover')) {
        console.log('✅ Successfully redirected to discover page')
        
        // Check authentication status
        const authStatus = await page.evaluate(() => {
          const authStore = localStorage.getItem('fan-club-z-auth')
          const token = localStorage.getItem('auth_token')
          const compliance = localStorage.getItem('compliance_status')
          
          return {
            hasAuthStore: !!authStore,
            hasToken: !!token,
            hasCompliance: !!compliance,
            authStore: authStore ? JSON.parse(authStore) : null
          }
        })
        
        console.log('🔍 Authentication Status:', authStatus)
        
        // Check if Sign In button is visible (this would be the bug)
        const signInVisible = await page.isVisible('text=Sign In').catch(() => false)
        const profileVisible = await page.isVisible('[data-testid="nav-profile"]').catch(() => false)
        
        console.log('🔍 Bottom Navigation Status:')
        console.log('  - Sign In button visible:', signInVisible)
        console.log('  - Profile tab visible:', profileVisible)
        
        // Check if user is properly welcomed
        const welcomeVisible = await page.isVisible('text=Welcome back').catch(() => false)
        console.log('  - Welcome message visible:', welcomeVisible)
        
        if (signInVisible && !profileVisible) {
          console.log('❌ BUG DETECTED: User is authenticated but Sign In button is still showing!')
          console.log('❌ This confirms the issue described by the user.')
        } else if (!signInVisible && profileVisible) {
          console.log('✅ SUCCESS: User is properly authenticated and Profile tab is showing')
        } else {
          console.log('⚠️ UNCLEAR: Navigation state is ambiguous')
        }
        
      } else {
        console.log('❌ ERROR: Not redirected to discover page after onboarding')
      }
      
    } else {
      console.log('❌ ERROR: Not redirected to onboarding after registration')
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  } finally {
    console.log('🧹 Cleaning up...')
    await browser.close()
  }
}

// Run the test
testRegistrationOnboardingFlow().catch(console.error)
