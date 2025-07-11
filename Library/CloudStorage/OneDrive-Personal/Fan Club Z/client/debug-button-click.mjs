import { chromium } from 'playwright'

async function debugButtonClick() {
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
    console.log('🔍 Debugging button click...')
    
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
    
    // Try different approaches to click the Close button
    console.log('🔍 Trying different Close button selectors...')
    
    // Method 1: Text selector
    try {
      await page.click('text=Close')
      console.log('✅ Method 1: Text selector worked')
    } catch (error) {
      console.log('❌ Method 1: Text selector failed')
    }
    
    await page.waitForTimeout(1000)
    
    // Method 2: Button with text
    try {
      await page.click('button:has-text("Close")')
      console.log('✅ Method 2: Button with text worked')
    } catch (error) {
      console.log('❌ Method 2: Button with text failed')
    }
    
    await page.waitForTimeout(1000)
    
    // Method 3: Last button on page
    try {
      const buttons = await page.locator('button').all()
      const lastButton = buttons[buttons.length - 1]
      await lastButton.click()
      console.log('✅ Method 3: Last button worked')
    } catch (error) {
      console.log('❌ Method 3: Last button failed')
    }
    
    await page.waitForTimeout(1000)
    
    // Method 4: Force click
    try {
      await page.click('text=Close', { force: true })
      console.log('✅ Method 4: Force click worked')
    } catch (error) {
      console.log('❌ Method 4: Force click failed')
    }
    
    await page.waitForTimeout(2000)
    
    // Check if we moved to the completion page
    const completionText = await page.locator('text=You\'re All Set').count()
    if (completionText > 0) {
      console.log('✅ Successfully reached completion page!')
    } else {
      console.log('❌ Still on Responsible Gambling page')
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error)
  } finally {
    await browser.close()
  }
}

debugButtonClick().catch(console.error) 