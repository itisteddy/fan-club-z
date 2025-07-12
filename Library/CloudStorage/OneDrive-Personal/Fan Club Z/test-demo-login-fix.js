const { chromium } = require('playwright')

async function testDemoLoginFlow() {
  console.log('🧪 Testing Demo Login Flow After Fixes...')
  
  const browser = await chromium.launch({ 
    headless: false,
    devtools: true,
    slowMo: 100
  })
  
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 }, // iPhone 14 Pro
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
  })
  
  const page = await context.newPage()
  
  try {
    // Step 1: Navigate to the app
    console.log('1️⃣ Navigating to the app...')
    await page.goto('http://172.20.2.210:3000')
    await page.waitForTimeout(2000)
    
    // Check if we're redirected to login
    if (page.url().includes('/auth/login')) {
      console.log('✅ Redirected to login page as expected')
    } else {
      console.log('❌ Not on login page, current URL:', page.url())
    }
    
    // Step 2: Click demo login button
    console.log('2️⃣ Looking for demo login button...')
    const demoButton = await page.locator('[data-testid=\"demo-login-button\"]')
    
    if (await demoButton.isVisible()) {
      console.log('✅ Demo login button found')
      await demoButton.click()
      console.log('✅ Demo login button clicked')
    } else {
      console.log('❌ Demo login button not found')
      // Take screenshot for debugging
      await page.screenshot({ path: 'login-page-no-demo-button.png' })
      throw new Error('Demo login button not found')
    }
    
    // Step 3: Wait for authentication and navigation
    console.log('3️⃣ Waiting for authentication and navigation...')
    await page.waitForTimeout(3000)
    
    // Check if we're redirected to discover page
    if (page.url().includes('/discover')) {
      console.log('✅ Successfully navigated to discover page')
    } else if (page.url().includes('/auth/login')) {
      console.log('❌ Still on login page, checking for errors...')
      
      // Check for error messages
      const errorElements = await page.locator('.text-red-500, .bg-red-50').all()
      if (errorElements.length > 0) {
        for (const error of errorElements) {
          const errorText = await error.textContent()
          console.log('❌ Error found:', errorText)
        }
      }
      
      await page.screenshot({ path: 'login-failed.png' })
      throw new Error('Authentication failed')
    } else {
      console.log('❌ Unexpected page:', page.url())
      await page.screenshot({ path: 'unexpected-page.png' })
    }
    
    // Step 4: Check if compliance is shown or skipped
    console.log('4️⃣ Checking for compliance flow...')
    await page.waitForTimeout(1000)
    
    // Look for compliance manager or discover content
    const getStartedButton = page.locator('[data-testid=\"get-started-button\"]')
    const bottomNavigation = page.locator('[data-testid=\"bottom-navigation\"]')
    
    if (await getStartedButton.isVisible()) {
      console.log('❌ Compliance flow shown (should be skipped for demo user)')
      await page.screenshot({ path: 'compliance-not-skipped.png' })
    } else if (await bottomNavigation.isVisible()) {
      console.log('✅ Compliance flow skipped, main app visible')
    } else {
      console.log('❓ Checking what\'s on screen...')
      await page.screenshot({ path: 'unknown-state.png' })
    }
    
    // Step 5: Check for bottom navigation
    console.log('5️⃣ Checking for bottom navigation...')
    const bottomNav = page.locator('[data-testid=\"bottom-navigation\"]')
    
    if (await bottomNav.isVisible()) {
      console.log('✅ Bottom navigation is visible')
    } else {
      console.log('❌ Bottom navigation not found')
      await page.screenshot({ path: 'no-bottom-nav.png' })
    }
    
    // Step 6: Check for bet cards in discover tab
    console.log('6️⃣ Checking for bet cards...')
    await page.waitForTimeout(2000) // Give time for API calls
    
    const betCards = page.locator('[data-testid=\"bet-card\"]')
    const betCardCount = await betCards.count()
    
    if (betCardCount > 0) {
      console.log(`✅ Found ${betCardCount} bet cards`)
    } else {
      console.log('❌ No bet cards found')
      
      // Check for loading states or error messages
      const loadingElements = await page.locator('.animate-spin, .animate-pulse').count()
      if (loadingElements > 0) {
        console.log('⏳ Still loading, waiting longer...')
        await page.waitForTimeout(3000)
        const betCardsAfterWait = await page.locator('[data-testid=\"bet-card\"]').count()
        console.log(`📊 Bet cards after longer wait: ${betCardsAfterWait}`)
      }
      
      await page.screenshot({ path: 'no-bet-cards.png' })
    }
    
    // Step 7: Test navigation to profile
    console.log('7️⃣ Testing navigation to profile...')
    const profileTab = page.locator('[data-testid=\"bottom-navigation\"]').locator('button').filter({ hasText: 'Profile' }).or(
      page.locator('[data-testid=\"bottom-navigation\"]').locator('button').filter({ hasText: 'Sign In' })
    ).first()
    
    if (await profileTab.isVisible()) {
      await profileTab.click()
      await page.waitForTimeout(1000)
      
      if (page.url().includes('/profile')) {
        console.log('✅ Successfully navigated to profile')
      } else {
        console.log('❌ Profile navigation failed, current URL:', page.url())
      }
    } else {
      console.log('❌ Profile tab not found in bottom navigation')
    }
    
    // Step 8: Test navigation to wallet
    console.log('8️⃣ Testing navigation to wallet...')
    const walletTab = page.locator('[data-testid=\"bottom-navigation\"]').locator('button').filter({ hasText: 'Wallet' }).first()
    
    if (await walletTab.isVisible()) {
      await walletTab.click()
      await page.waitForTimeout(1000)
      
      if (page.url().includes('/wallet')) {
        console.log('✅ Successfully navigated to wallet')
      } else {
        console.log('❌ Wallet navigation failed, current URL:', page.url())
      }
    } else {
      console.log('❌ Wallet tab not found in bottom navigation')
    }
    
    console.log('🎉 Demo login flow test completed!')
    
  } catch (error) {
    console.error('❌ Test failed:', error.message)
    await page.screenshot({ path: 'test-failure.png' })
  } finally {
    await browser.close()
  }
}

// Add timeout and error handling
const runTest = async () => {
  try {
    await testDemoLoginFlow()
  } catch (error) {
    console.error('💥 Fatal error:', error)
    process.exit(1)
  }
}

runTest()
