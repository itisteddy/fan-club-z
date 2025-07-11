import { chromium } from 'playwright'

async function debugButtonState() {
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
    console.log('🔍 Debugging button state...')
    
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
    
    // Scroll to bottom
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await page.waitForTimeout(1000)
    
    // Check button state
    console.log('🔍 Checking button state...')
    
    // Get all buttons
    const buttons = await page.locator('button').all()
    console.log(`🔍 Found ${buttons.length} buttons`)
    
    // Check each button
    for (let i = 0; i < buttons.length; i++) {
      const button = buttons[i]
      const text = await button.textContent()
      const isVisible = await button.isVisible()
      const isEnabled = await button.isEnabled()
      console.log(`🔍 Button ${i + 1}: "${text}" - Visible: ${isVisible}, Enabled: ${isEnabled}`)
    }
    
    // Try to find the Close button specifically
    const closeButtons = await page.locator('button:has-text("Close")').all()
    console.log(`🔍 Found ${closeButtons.length} Close buttons`)
    
    for (let i = 0; i < closeButtons.length; i++) {
      const button = closeButtons[i]
      const text = await button.textContent()
      const isVisible = await button.isVisible()
      const isEnabled = await button.isEnabled()
      console.log(`🔍 Close button ${i + 1}: "${text}" - Visible: ${isVisible}, Enabled: ${isEnabled}`)
      
      // Only click the button that says exactly "Close" (not "Close Account")
      if (isVisible && isEnabled && text?.trim() === 'Close') {
        console.log(`🔍 Attempting to click Close button ${i + 1}...`)
        try {
          await button.click()
          console.log(`✅ Successfully clicked Close button ${i + 1}`)
          break
        } catch (error) {
          console.log(`❌ Failed to click Close button ${i + 1}:`, error.message)
        }
      }
    }
    
    // Wait and check if state changed
    await page.waitForTimeout(3000)
    
    const finalText = await page.textContent('body')
    if (finalText?.includes('You\'re All Set')) {
      console.log('🎉 Successfully reached completion page!')
    } else {
      console.log('❌ Still on Responsible Gambling page')
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error)
  } finally {
    await browser.close()
  }
}

debugButtonState().catch(console.error) 