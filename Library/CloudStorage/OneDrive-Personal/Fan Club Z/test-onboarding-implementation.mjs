#!/usr/bin/env node

import { chromium } from 'playwright'

async function testOnboardingImplementation() {
  console.log('🧪 Testing Onboarding Implementation...')
  
  const browser = await chromium.launch({ 
    headless: false,
    args: ['--disable-web-security']
  })
  
  const page = await browser.newPage()
  
  try {
    // Step 1: Navigate to app and check login page
    console.log('\n🔐 Step 1: Checking Login Page')
    await page.goto('http://localhost:3000')
    await page.waitForLoadState('networkidle')
    
    // Verify login page elements
    await page.waitForSelector('text=Welcome to Fan Club Z', { timeout: 10000 })
    console.log('✅ Login page loaded')
    
    // Check for demo button
    const demoButton = page.locator('[data-testid="demo-login-button"]')
    await demoButton.waitFor({ timeout: 5000 })
    console.log('✅ Demo button found')
    
    // Step 2: Click demo button
    console.log('\n🎯 Step 2: Demo Login')
    await demoButton.click()
    await page.waitForTimeout(3000)
    
    const currentUrl = page.url()
    console.log(`📍 Current URL after demo login: ${currentUrl}`)
    
    // Step 3: Test onboarding flow
    console.log('\n📋 Step 3: Onboarding Flow')
    
    // Check if we're on onboarding page
    if (currentUrl.includes('/onboarding')) {
      console.log('✅ Navigated to onboarding page')
      
      // Step 3a: Welcome screen
      const welcomeText = await page.locator('text=Welcome to Fan Club Z').first()
      if (await welcomeText.isVisible({ timeout: 3000 })) {
        console.log('✅ Welcome screen visible')
        
        const getStartedBtn = page.locator('button:has-text("Get Started")')
        if (await getStartedBtn.isVisible({ timeout: 2000 })) {
          await getStartedBtn.click()
          console.log('✅ Clicked Get Started')
          await page.waitForTimeout(2000)
        }
      }
      
      // Step 3b: Terms of Service
      const termsTitle = page.locator('text=Terms of Service')
      if (await termsTitle.isVisible({ timeout: 5000 })) {
        console.log('✅ Terms of Service page visible')
        
        const agreeBtn = page.locator('button:has-text("I Agree")')
        await agreeBtn.click()
        console.log('✅ Terms accepted')
        await page.waitForTimeout(2000)
      }
      
      // Step 3c: Privacy Policy
      const privacyTitle = page.locator('text=Privacy Policy')
      if (await privacyTitle.isVisible({ timeout: 5000 })) {
        console.log('✅ Privacy Policy page visible')
        
        const agreeBtn = page.locator('button:has-text("I Agree")')
        await agreeBtn.click()
        console.log('✅ Privacy Policy accepted')
        await page.waitForTimeout(2000)
      }
      
      // Step 3d: Responsible Gambling
      const responsibleTitle = page.locator('text=Responsible Gambling')
      if (await responsibleTitle.isVisible({ timeout: 5000 })) {
        console.log('✅ Responsible Gambling page visible')
        
        const closeBtn = page.locator('button:has-text("Close")')
        await closeBtn.click()
        console.log('✅ Responsible Gambling closed')
        await page.waitForTimeout(2000)
      }
      
      // Step 3e: Setup Complete
      const completeTitle = page.locator('text=Setup Complete!')
      if (await completeTitle.isVisible({ timeout: 5000 })) {
        console.log('✅ Setup Complete page visible')
        
        const startBtn = page.locator('button:has-text("Start Exploring")')
        await startBtn.click()
        console.log('✅ Start Exploring clicked')
        await page.waitForTimeout(3000)
      }
      
      // Step 4: Verify main app
      console.log('\n🏠 Step 4: Verifying Main App')
      const finalUrl = page.url()
      console.log(`📍 Final URL: ${finalUrl}`)
      
      // Check for bottom navigation
      const bottomNav = page.locator('[data-testid="bottom-navigation"]')
      if (await bottomNav.isVisible({ timeout: 10000 })) {
        console.log('✅ Bottom navigation visible')
        
        // Check for Discover page
        const discoverHeader = page.locator('header h1:has-text("Discover")')
        if (await discoverHeader.isVisible({ timeout: 5000 })) {
          console.log('✅ Discover page loaded')
          console.log('🎉 ONBOARDING FLOW COMPLETED SUCCESSFULLY!')
        } else {
          console.log('⚠️ Discover page not found')
        }
      } else {
        console.log('❌ Bottom navigation not visible')
      }
      
    } else {
      console.log('❌ Not on onboarding page')
      console.log('📄 Page content preview:')
      const pageText = await page.textContent('body')
      console.log(pageText?.substring(0, 500))
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error)
    
    // Debug info
    console.log('\n🔍 Debug Information:')
    console.log('URL:', page.url())
    
    const pageText = await page.textContent('body').catch(() => 'Could not get page text')
    console.log('Page content preview:', pageText?.substring(0, 500))
    
  } finally {
    await browser.close()
  }
}

testOnboardingImplementation()
