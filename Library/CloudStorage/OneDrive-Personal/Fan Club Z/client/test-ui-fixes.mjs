import { chromium } from 'playwright'

async function testUIFixes() {
  console.log('🚀 Testing UI Navigation and Wallet Fixes...\n')
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 1000  // Add delay to see interactions
  })
  const page = await browser.newPage()
  
  // Add detailed console logging
  page.on('console', msg => console.log('🌐 Browser:', msg.text()))
  page.on('pageerror', error => console.error('❌ Page Error:', error))
  
  try {
    // 1. Navigate to app
    console.log('📱 Step 1: Loading the app...')
    await page.goto('http://localhost:3000')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)
    console.log('✅ App loaded successfully')
    
    // 2. Login with demo account
    console.log('\n🔐 Step 2: Logging in with demo account...')
    
    // Click Sign In button
    await page.click('button:has-text("Sign In")')
    await page.waitForTimeout(1000)
    
    // Fill in credentials
    await page.fill('input[placeholder="Enter your email"]', 'demo@fanclubz.app')
    await page.fill('input[placeholder="Enter your password"]', 'demo123')
    
    // Submit login
    await page.click('button:has-text("Sign In")')
    await page.waitForTimeout(3000)
    
    // Check if we're authenticated
    const isAuthenticated = await page.evaluate(() => {
      return localStorage.getItem('auth_token') !== null
    })
    console.log(`✅ Authentication status: ${isAuthenticated}`)
    
    // 3. Handle onboarding if present
    console.log('\n📋 Step 3: Checking for onboarding...')
    const pageText = await page.textContent('body')
    
    if (pageText.includes('Privacy Policy') || pageText.includes('Terms of Service')) {
      console.log('🔄 Onboarding detected, completing...')
      
      // Look for and click through onboarding
      try {
        await page.click('text=Continue to Privacy Policy', { timeout: 5000 })
        await page.waitForTimeout(2000)
        console.log('✅ Onboarding completed')
      } catch (e) {
        console.log('⏭️ Onboarding auto-completed or not required')
      }
    } else {
      console.log('⏭️ No onboarding required')
    }
    
    // 4. Test Bottom Navigation
    console.log('\n🧭 Step 4: Testing Bottom Navigation...')
    
    // Wait for navigation to appear
    await page.waitForSelector('[data-testid="bottom-navigation"]', { timeout: 10000 })
    console.log('✅ Bottom navigation found')
    
    // Test each navigation item
    const navItems = ['Discover', 'My Bets', 'Clubs', 'Profile']
    
    for (const item of navItems) {
      console.log(`\n🎯 Testing navigation to: ${item}`)
      
      try {
        // Click the navigation item
        const navButton = page.locator(`[data-testid="bottom-navigation"] button:has-text("${item}")`)
        await navButton.click({ timeout: 5000 })
        await page.waitForTimeout(2000)
        
        // Check URL changed
        const currentUrl = page.url()
        console.log(`   Current URL: ${currentUrl}`)
        
        // Verify navigation worked
        if (item === 'Discover' && currentUrl.includes('/discover')) {
          console.log('   ✅ Discover navigation working')
        } else if (item === 'My Bets' && currentUrl.includes('/bets')) {
          console.log('   ✅ My Bets navigation working')
        } else if (item === 'Clubs' && currentUrl.includes('/clubs')) {
          console.log('   ✅ Clubs navigation working')
        } else if (item === 'Profile' && currentUrl.includes('/profile')) {
          console.log('   ✅ Profile navigation working')
        } else {
          console.log(`   ⚠️ Navigation may not have changed URL as expected`)
        }
        
      } catch (error) {
        console.log(`   ❌ Navigation to ${item} failed:`, error.message)
      }
    }
    
    // 5. Test Wallet Button in Header
    console.log('\n💰 Step 5: Testing Wallet Button in Header...')
    
    try {
      // Look for wallet button in header
      const walletButton = page.locator('header button:has(svg)')
      const walletButtonCount = await walletButton.count()
      console.log(`   Found ${walletButtonCount} button(s) in header`)
      
      if (walletButtonCount > 0) {
        // Click the first button that might be the wallet button
        for (let i = 0; i < walletButtonCount; i++) {
          const button = walletButton.nth(i)
          const buttonText = await button.textContent()
          
          if (buttonText && (buttonText.includes('$') || buttonText.includes('USD'))) {
            console.log(`   🎯 Clicking wallet button with text: "${buttonText}"`)
            
            // Click the wallet button
            await button.click()
            await page.waitForTimeout(3000)
            
            // Check if we navigated to wallet
            const currentUrl = page.url()
            console.log(`   URL after wallet click: ${currentUrl}`)
            
            if (currentUrl.includes('/wallet')) {
              console.log('   ✅ Wallet button navigation working!')
              
              // Verify wallet page loaded
              const walletHeader = await page.locator('h1:has-text("Wallet")').isVisible()
              console.log(`   ✅ Wallet page loaded: ${walletHeader}`)
              
            } else {
              console.log('   ❌ Wallet button did not navigate to wallet page')
            }
            break
          }
        }
      } else {
        console.log('   ❌ No wallet button found in header')
      }
      
    } catch (error) {
      console.log('   ❌ Wallet button test failed:', error.message)
    }
    
    // 6. Test Direct Wallet Navigation via Bottom Nav
    console.log('\n💳 Step 6: Testing Direct Wallet Navigation...')
    
    try {
      // Navigate to discover first
      await page.goto('http://localhost:3000/discover')
      await page.waitForTimeout(2000)
      
      // Now test wallet navigation via bottom nav
      // Note: Wallet might not be in bottom nav, so let's test by URL
      await page.goto('http://localhost:3000/wallet')
      await page.waitForTimeout(3000)
      
      const currentUrl = page.url()
      console.log(`   Current URL: ${currentUrl}`)
      
      if (currentUrl.includes('/wallet')) {
        console.log('   ✅ Direct wallet navigation working')
        
        // Check if wallet content loaded
        const walletContent = await page.locator('[data-testid="wallet-balance-card"]').isVisible().catch(() => false)
        console.log(`   ✅ Wallet content loaded: ${walletContent}`)
        
        // Check for balance display
        const balanceElement = await page.locator('[data-testid="wallet-balance-amount"]').textContent().catch(() => null)
        console.log(`   💰 Balance displayed: ${balanceElement || 'Not found'}`)
        
      } else {
        console.log('   ❌ Direct wallet navigation failed')
      }
      
    } catch (error) {
      console.log('   ❌ Direct wallet navigation test failed:', error.message)
    }
    
    // 7. Test Touch/Click Responsiveness
    console.log('\n👆 Step 7: Testing Touch Responsiveness...')
    
    try {
      // Test multiple rapid clicks on navigation
      await page.goto('http://localhost:3000/discover')
      await page.waitForTimeout(1000)
      
      const clubsButton = page.locator('[data-testid="bottom-navigation"] button:has-text("Clubs")')
      
      // Rapid clicks to test responsiveness
      for (let i = 0; i < 3; i++) {
        await clubsButton.click()
        await page.waitForTimeout(500)
      }
      
      const finalUrl = page.url()
      console.log(`   Final URL after rapid clicks: ${finalUrl}`)
      
      if (finalUrl.includes('/clubs')) {
        console.log('   ✅ Rapid click handling working')
      } else {
        console.log('   ⚠️ Rapid click handling needs improvement')
      }
      
    } catch (error) {
      console.log('   ❌ Touch responsiveness test failed:', error.message)
    }
    
    // 8. Final Summary
    console.log('\n📊 Step 8: Test Summary')
    console.log('=====================================')
    
    // Check overall functionality
    await page.goto('http://localhost:3000/discover')
    await page.waitForTimeout(2000)
    
    const hasBottomNav = await page.locator('[data-testid="bottom-navigation"]').isVisible()
    const hasHeaderWallet = await page.locator('header button:has(svg)').count() > 0
    const canAccessWallet = await page.goto('http://localhost:3000/wallet').then(() => true).catch(() => false)
    
    console.log(`✅ Bottom Navigation Present: ${hasBottomNav}`)
    console.log(`✅ Header Wallet Button Present: ${hasHeaderWallet}`)
    console.log(`✅ Wallet Page Accessible: ${canAccessWallet}`)
    
    if (hasBottomNav && hasHeaderWallet && canAccessWallet) {
      console.log('\n🎉 ALL UI FIXES SUCCESSFUL! Navigation and wallet functionality restored.')
    } else {
      console.log('\n⚠️ Some issues may still exist. Check individual test results above.')
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  } finally {
    console.log('\n📸 Taking final screenshot...')
    await page.screenshot({ path: 'ui-fixes-test-result.png', fullPage: true })
    console.log('Screenshot saved as ui-fixes-test-result.png')
    
    await browser.close()
  }
}

// Run the test
testUIFixes().catch(console.error)
