import { chromium } from 'playwright'

async function testFinalComplete() {
  const browser = await chromium.launch({ 
    headless: false,
    args: ['--disable-web-security', '--disable-features=VizDisplayCompositor']
  })
  
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 }, // iPhone 14
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
  })
  
  const page = await context.newPage()
  
  // Listen for console messages
  page.on('console', msg => {
    console.log('🔍 Console:', msg.type(), msg.text())
  })
  
  try {
    console.log('🧪 Starting final complete test...')
    
    // Navigate to the app
    await page.goto('http://localhost:3000')
    console.log('✅ App loaded')
    
    // Click Sign In button
    await page.click('text=Sign In')
    console.log('✅ Sign In button clicked')
    
    // Wait for login page to load
    await page.waitForTimeout(3000)
    
    // Fill in demo credentials
    await page.fill('input[placeholder="Enter your email"]', 'demo@fanclubz.app')
    await page.fill('input[placeholder="Enter your password"]', 'demo123')
    console.log('✅ Demo credentials filled')
    
    // Click login button
    await page.click('button[type="submit"]')
    console.log('✅ Login button clicked')
    
    // Wait for onboarding to start
    await page.waitForTimeout(3000)
    
    // Complete onboarding flow
    await page.click('text=Continue to Privacy Policy')
    console.log('✅ Privacy policy step')
    
    await page.waitForTimeout(1000)
    await page.click('text=Accept Privacy Policy')
    console.log('✅ Privacy policy accepted')
    
    await page.waitForTimeout(1000)
    await page.click('text=Accept Terms of Service')
    console.log('✅ Terms accepted')
    
    await page.waitForTimeout(1000)
    
    // Scroll to bottom and click the correct Close button
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await page.waitForTimeout(500)
    
    const closeButtons = await page.locator('button').all()
    for (const button of closeButtons) {
      const text = await button.textContent()
      if (text?.trim() === 'Close') {
        await button.click()
        break
      }
    }
    console.log('✅ Responsible gambling closed')
    
    await page.waitForTimeout(2000)
    
    // Click Start Betting
    await page.click('text=Start Betting')
    console.log('✅ Start Betting clicked')
    
    // Wait for main app to load
    await page.waitForTimeout(5000)
    
    // Check if we're on the main app
    const discoverText = await page.locator('text=Discover').count()
    if (discoverText > 0) {
      console.log('✅ Main app loaded')
      
      // Check for bottom navigation
      const bottomNav = await page.locator('[data-testid="bottom-navigation"]').count()
      if (bottomNav > 0) {
        console.log('✅ Bottom navigation found')
        
        // Click on Profile tab
        await page.click('text=Profile')
        console.log('✅ Profile tab clicked')
        
        await page.waitForTimeout(2000)
        
        // Check for profile elements
        const profileElements = [
          'text=Demo User',
          'text=Demo account for testing',
          'text=Edit Profile',
          'text=Wallet',
          'text=Security',
          'text=Sign Out'
        ]
        
        let foundCount = 0
        for (const element of profileElements) {
          const found = await page.locator(element).count()
          if (found > 0) {
            console.log(`✅ Found: ${element}`)
            foundCount++
          } else {
            console.log(`❌ Missing: ${element}`)
          }
        }
        
        console.log(`📊 Profile elements found: ${foundCount}/${profileElements.length}`)
        
        // Test Edit Profile button if found
        const editProfileBtn = await page.locator('text=Edit Profile').first()
        if (await editProfileBtn.isVisible()) {
          await editProfileBtn.click()
          console.log('✅ Edit Profile button clicked')
          
          await page.waitForTimeout(1000)
          
          // Check if edit modal opened
          const modal = await page.locator('[role="dialog"], .fixed').count()
          if (modal > 0) {
            console.log('✅ Edit Profile modal opened')
            
            // Close modal by clicking outside or escape
            await page.keyboard.press('Escape')
            console.log('✅ Modal closed with Escape key')
          } else {
            console.log('❌ Edit Profile modal not found')
          }
        }
        
        // Test wallet card if found
        const walletCard = await page.locator('text=Wallet Balance').count()
        if (walletCard > 0) {
          console.log('✅ Wallet card visible')
          
          // Check for balance amount
          const balance = await page.locator('text=$2,500').count()
          if (balance > 0) {
            console.log('✅ Wallet balance displayed correctly')
          }
        }
        
        // Test logout if found
        const logoutBtn = await page.locator('text=Logout').count()
        if (logoutBtn > 0) {
          console.log('✅ Logout button found')
        }
        
        console.log('🎉 Profile features test completed!')
        
      } else {
        console.log('❌ Bottom navigation not found')
      }
      
    } else {
      console.log('❌ Main app not loaded')
      
      // Check what's on the page
      const pageContent = await page.textContent('body')
      console.log('Page content preview:', pageContent?.substring(0, 500))
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error)
    
    // Take screenshot for debugging
    await page.screenshot({ path: 'test-final-error.png', fullPage: true })
    console.log('📸 Screenshot saved as test-final-error.png')
  } finally {
    await browser.close()
  }
}

testFinalComplete().catch(console.error) 