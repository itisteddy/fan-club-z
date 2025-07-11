import { chromium } from 'playwright'

async function debugProfileAccess() {
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
    console.log('🔍 DEBUGGING PROFILE ACCESS')
    console.log('===========================')
    
    // Step 1: Login
    console.log('\n🔐 Step 1: Demo Login')
    await page.goto('http://localhost:3000')
    await page.click('text=Sign In')
    await page.waitForTimeout(1000)
    
    const demoButton = await page.locator('button:has-text("Try Demo")').first()
    await demoButton.click()
    console.log('✅ Demo login clicked')
    
    // Wait for onboarding to complete
    await page.waitForTimeout(8000)
    
    // Check current URL
    const currentUrl = page.url()
    console.log('📍 Current URL:', currentUrl)
    
    // Check if bottom navigation is visible
    const bottomNav = await page.locator('[data-testid="bottom-navigation"]').count()
    console.log('🔍 Bottom navigation found:', bottomNav > 0)
    
    if (bottomNav > 0) {
      // Try to find profile button
      const profileButtons = await page.locator('button').all()
      console.log('🔍 Total buttons found:', profileButtons.length)
      
      for (let i = 0; i < profileButtons.length; i++) {
        const button = profileButtons[i]
        const text = await button.textContent()
        if (text && text.includes('Profile')) {
          console.log(`✅ Found Profile button at index ${i}: "${text}"`)
          await button.click()
          console.log('✅ Profile button clicked')
          break
        }
      }
      
      await page.waitForTimeout(3000)
      
      // Check if we're on profile page
      const profileUrl = page.url()
      console.log('📍 Profile URL:', profileUrl)
      
      // Look for profile elements
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
      
      for (const element of profileElements) {
        const count = await page.locator(element).count()
        console.log(`🔍 ${element}: ${count} found`)
      }
      
    } else {
      console.log('❌ Bottom navigation not found')
      
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

debugProfileAccess() 