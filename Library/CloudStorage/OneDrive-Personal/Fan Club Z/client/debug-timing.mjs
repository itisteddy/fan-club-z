import { chromium } from 'playwright'

async function debugTiming() {
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
    console.log('🔍 Debugging timing...')
    
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
    
    // Click Close button
    console.log('🔍 About to click Close button...')
    await page.click('button:has-text("Close")')
    console.log('✅ Close button clicked')
    
    // Wait and check state changes
    for (let i = 0; i < 10; i++) {
      await page.waitForTimeout(500)
      console.log(`🔍 Check ${i + 1}: Waiting for state change...`)
      
      // Check for completion text
      const completionText = await page.locator('text=You\'re All Set').count()
      if (completionText > 0) {
        console.log('✅ Completion page found!')
        break
      }
      
      // Check if still on responsible gambling
      const responsibleText = await page.locator('text=Responsible Gambling').count()
      if (responsibleText === 0) {
        console.log('✅ Moved away from Responsible Gambling page')
        break
      }
      
      console.log('⏳ Still waiting...')
    }
    
    // Final check
    const finalText = await page.textContent('body')
    if (finalText?.includes('You\'re All Set')) {
      console.log('🎉 Successfully reached completion page!')
      
      // Click Start Betting
      await page.click('text=Start Betting')
      console.log('✅ Start Betting clicked')
      
      await page.waitForTimeout(3000)
      
      // Check for bottom navigation
      const bottomNav = await page.locator('[data-testid="bottom-navigation"]').count()
      if (bottomNav > 0) {
        console.log('✅ Bottom navigation found!')
      } else {
        console.log('❌ Bottom navigation not found')
      }
      
    } else {
      console.log('❌ Never reached completion page')
      console.log('Final page content preview:', finalText?.substring(0, 200))
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error)
  } finally {
    await browser.close()
  }
}

debugTiming().catch(console.error) 