import { chromium } from 'playwright'

async function debugOnboardingComplete() {
  const browser = await chromium.launch({ 
    headless: false,
    args: ['--disable-web-security', '--disable-features=VizDisplayCompositor']
  })
  
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 }, // iPhone 14
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
  })
  
  const page = await context.newPage()
  
  try {
    console.log('🔍 DEBUGGING ONBOARDING COMPLETION')
    console.log('==================================')
    
    // Step 1: Login
    console.log('\n🔐 Step 1: Demo Login')
    await page.goto('http://localhost:3000')
    await page.click('text=Sign In')
    await page.waitForTimeout(1000)
    
    const demoButton = await page.locator('button:has-text("Try Demo")').first()
    await demoButton.click()
    console.log('✅ Demo login clicked')
    
    // Wait for onboarding to start
    await page.waitForTimeout(3000)
    
    // Step 2: Complete Privacy Policy
    console.log('\n📄 Step 2: Privacy Policy')
    const privacyButton = await page.locator('button:has-text("Continue to Privacy Policy")').first()
    if (await privacyButton.isVisible()) {
      await privacyButton.click()
      console.log('✅ Privacy Policy button clicked')
    } else {
      console.log('ℹ️ Already on Privacy Policy page')
    }
    
    await page.waitForTimeout(2000)
    
    // Accept Privacy Policy
    const acceptPrivacyButton = await page.locator('button:has-text("Accept")').first()
    if (await acceptPrivacyButton.isVisible()) {
      await acceptPrivacyButton.click()
      console.log('✅ Privacy Policy accepted')
    } else {
      console.log('ℹ️ Privacy Policy already accepted or not found')
    }
    
    await page.waitForTimeout(2000)
    
    // Step 3: Complete Terms of Service
    console.log('\n📋 Step 3: Terms of Service')
    const acceptTermsButton = await page.locator('button:has-text("Accept Terms of Service")').first()
    if (await acceptTermsButton.isVisible()) {
      await acceptTermsButton.click()
      console.log('✅ Terms of Service accepted')
    } else {
      console.log('ℹ️ Terms of Service already accepted or not found')
    }
    
    await page.waitForTimeout(2000)
    
    // Step 4: Complete Responsible Gambling
    console.log('\n🎰 Step 4: Responsible Gambling')
    
    // Look for the Close button specifically
    const closeButtons = await page.locator('button').all()
    let closeButtonFound = false
    for (const button of closeButtons) {
      const text = await button.textContent()
      if (text?.trim() === 'Close') {
        await button.click()
        console.log('✅ Close button clicked')
        closeButtonFound = true
        break
      }
    }
    
    if (!closeButtonFound) {
      console.log('ℹ️ Close button not found, trying alternative')
      // Try pressing Escape
      await page.keyboard.press('Escape')
      console.log('✅ Escape key pressed')
    }
    
    await page.waitForTimeout(3000)
    
    // Step 4.5: Complete "You're All Set!" page
    console.log('\n🎉 Step 4.5: Complete Setup')
    const startBettingButton = await page.locator('button:has-text("Start Betting")').first()
    if (await startBettingButton.isVisible()) {
      await startBettingButton.click()
      console.log('✅ Start Betting button clicked')
    } else {
      console.log('ℹ️ Start Betting button not found')
    }
    
    await page.waitForTimeout(3000)
    
    // Step 5: Check if onboarding is complete
    console.log('\n✅ Step 5: Check Completion')
    const currentUrl = page.url()
    console.log('📍 Current URL:', currentUrl)
    
    // Check if bottom navigation is now visible
    const bottomNav = await page.locator('[data-testid="bottom-navigation"]').count()
    console.log('🔍 Bottom navigation found:', bottomNav > 0)
    
    if (bottomNav > 0) {
      console.log('🎉 Onboarding completed successfully!')
      
      // Try to navigate to profile
      const profileButtons = await page.locator('button').all()
      for (let i = 0; i < profileButtons.length; i++) {
        const button = profileButtons[i]
        const text = await button.textContent()
        if (text && text.includes('Profile')) {
          console.log(`✅ Found Profile button: "${text}"`)
          await button.click()
          console.log('✅ Profile button clicked')
          break
        }
      }
      
      await page.waitForTimeout(3000)
      
      // Check profile elements
      const profileElements = [
        'text=Demo User',
        'text=Edit Profile',
        'text=Security',
        'text=Notifications',
        'text=Payment Methods',
        'text=Transaction History',
        'text=Help & Support',
        'text=Sign Out'
      ]
      
      console.log('\n🔍 Profile Elements Check:')
      for (const element of profileElements) {
        const count = await page.locator(element).count()
        console.log(`${element}: ${count} found`)
      }
      
    } else {
      console.log('❌ Onboarding not completed - bottom navigation still not visible')
      
      // Check what's on the page
      const pageContent = await page.textContent('body')
      console.log('📄 Page content preview:', pageContent?.substring(0, 500))
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error)
  } finally {
    await browser.close()
  }
}

debugOnboardingComplete() 