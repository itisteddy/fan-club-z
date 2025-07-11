import { chromium } from 'playwright'

async function debugConsoleErrors() {
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
  
  // Listen for page errors
  page.on('pageerror', error => {
    console.log('❌ Page error:', error.message)
  })
  
  try {
    console.log('🔍 Debugging console errors...')
    
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
    
    // Click Close button and monitor for errors
    console.log('🔍 About to click Close button...')
    await page.click('text=Close')
    console.log('✅ Close button clicked')
    
    // Wait and check for any errors
    await page.waitForTimeout(3000)
    
    // Check if we're still on the same page
    const currentText = await page.textContent('body')
    if (currentText?.includes('Responsible Gambling')) {
      console.log('❌ Still on Responsible Gambling page after clicking Close')
      
      // Try to manually trigger the onClose function
      console.log('🔍 Attempting to manually trigger onClose...')
      await page.evaluate(() => {
        // Try to find and call the onClose function
        const closeButton = document.querySelector('button:contains("Close")')
        if (closeButton) {
          console.log('Found Close button, triggering click event')
          closeButton.click()
        }
      })
      
      await page.waitForTimeout(2000)
    } else {
      console.log('✅ Successfully moved past Responsible Gambling page')
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error)
  } finally {
    await browser.close()
  }
}

debugConsoleErrors().catch(console.error) 