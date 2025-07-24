#!/usr/bin/env node

import { chromium } from 'playwright'

async function testEmailCaseSensitivity() {
  console.log('🧪 Testing Email Case Sensitivity Fix...')
  
  const browser = await chromium.launch({ 
    headless: false, 
    devtools: false 
  })
  const context = await browser.newContext()
  const page = await context.newPage()

  try {
    // Navigate to login page
    console.log('📱 Opening Fan Club Z login page...')
    await page.goto('http://localhost:5173/auth/login')
    await page.waitForTimeout(2000)

    // Test case 1: Try login with mixed case email
    console.log('✏️ Testing login with mixed case email: Fausty@fcz.app...')
    
    await page.fill('#email', 'Fausty@fcz.app')
    await page.fill('#password', 'test123') // Use actual password if known
    
    // Check if email is visually accepted (no immediate validation error)
    const emailHasError = await page.isVisible('text=Please enter a valid email address').catch(() => false)
    
    if (!emailHasError) {
      console.log('✅ Mixed case email accepted by frontend validation')
    } else {
      console.log('❌ Mixed case email rejected by frontend validation')
    }
    
    // Test case 2: Check if lowercase conversion is working
    console.log('🔍 Checking if email is converted to lowercase in network request...')
    
    // Intercept network requests to see what gets sent
    let loginRequestData = null
    page.on('request', request => {
      if (request.url().includes('/login') && request.method() === 'POST') {
        try {
          loginRequestData = JSON.parse(request.postData() || '{}')
          console.log('📡 Login request data:', loginRequestData)
        } catch (e) {
          console.log('Could not parse request data')
        }
      }
    })
    
    // Submit the form (this will likely fail due to wrong password, but we can check the request)
    await page.click('button[type="submit"]')
    await page.waitForTimeout(2000)
    
    if (loginRequestData && loginRequestData.email === 'fausty@fcz.app') {
      console.log('✅ SUCCESS: Email converted to lowercase in request')
    } else if (loginRequestData && loginRequestData.email === 'Fausty@fcz.app') {
      console.log('❌ FAIL: Email NOT converted to lowercase in request')
    } else {
      console.log('⚠️ Could not capture login request data')
    }
    
    // Test case 3: Check error handling
    const errorVisible = await page.isVisible('.text-red-500, .bg-red-50').catch(() => false)
    if (errorVisible) {
      const errorText = await page.textContent('.text-red-500, .bg-red-50')
      console.log('🔍 Error message displayed:', errorText?.trim())
      
      if (errorText?.includes('email') && !errorText?.includes('valid email')) {
        console.log('✅ Error is about credentials, not email format (good)')
      }
    }
    
    console.log('\n📊 Test Summary:')
    console.log('- Email case sensitivity fix should allow "Fausty@fcz.app" to work')
    console.log('- Frontend should convert email to "fausty@fcz.app" before sending')
    console.log('- User should see credential error, not email format error')
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  } finally {
    console.log('🧹 Cleaning up...')
    await browser.close()
  }
}

// Check if app is running before testing
const testUrl = 'http://localhost:5173'
console.log(`🔍 Checking if app is running at ${testUrl}...`)

try {
  const response = await fetch(testUrl)
  if (response.ok) {
    console.log('✅ App is running, starting test...\n')
    await testEmailCaseSensitivity()
  } else {
    console.log('❌ App returned error status')
  }
} catch (error) {
  console.log('❌ App is not running. Please start it first:')
  console.log('   cd client && npm run dev')
}
