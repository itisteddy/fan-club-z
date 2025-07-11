import { chromium } from 'playwright'

async function debugCloseButton() {
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
    console.log('🔍 Debugging Close button...')
    
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
    
    // Check what buttons are available before clicking Close
    const buttonsBefore = await page.locator('button').allTextContents()
    console.log('🔘 Buttons before Close:', buttonsBefore)
    
    // Scroll to bottom
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await page.waitForTimeout(1000)
    
    // Check what buttons are available after scrolling
    const buttonsAfterScroll = await page.locator('button').allTextContents()
    console.log('🔘 Buttons after scroll:', buttonsAfterScroll)
    
    // Try to click Close button
    const closeButton = await page.locator('text=Close').first()
    if (await closeButton.isVisible()) {
      console.log('✅ Close button found and visible')
      await closeButton.click()
      console.log('✅ Close button clicked')
      
      // Wait and check what happens
      await page.waitForTimeout(2000)
      
      // Check what's on the page now
      const buttonsAfter = await page.locator('button').allTextContents()
      console.log('🔘 Buttons after Close:', buttonsAfter)
      
      // Check for completion text
      const completionTexts = [
        'You\'re All Set',
        'Start Betting',
        'Complete',
        'Welcome'
      ]
      
      for (const text of completionTexts) {
        const found = await page.locator(`text=${text}`).count()
        console.log(`🔍 "${text}": ${found} found`)
      }
      
      // Get page content
      const textContent = await page.textContent('body')
      console.log('📝 Page text content (first 500 chars):', textContent?.substring(0, 500))
      
    } else {
      console.log('❌ Close button not found or not visible')
    }
    
    // Take a screenshot
    await page.screenshot({ path: 'debug-close-button.png', fullPage: true })
    console.log('📸 Screenshot saved as debug-close-button.png')
    
  } catch (error) {
    console.error('❌ Debug failed:', error)
  } finally {
    await browser.close()
  }
}

debugCloseButton().catch(console.error) 