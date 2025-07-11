import { chromium } from 'playwright'

async function debugLoginForm() {
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
    console.log('🔍 Debugging login form...')
    
    // Navigate to the app
    await page.goto('http://localhost:3000')
    console.log('✅ App loaded')
    
    // Click Sign In button
    await page.click('text=Sign In')
    console.log('✅ Sign In button clicked')
    
    // Wait for login page to load
    await page.waitForTimeout(3000)
    
    // Check for forms
    const forms = await page.locator('form').count()
    console.log('📋 Number of forms:', forms)
    
    // Check for inputs
    const inputs = await page.locator('input').count()
    console.log('🔤 Number of inputs:', inputs)
    
    // Get all input attributes
    const inputElements = await page.locator('input').all()
    for (let i = 0; i < inputElements.length; i++) {
      const input = inputElements[i]
      const type = await input.getAttribute('type')
      const placeholder = await input.getAttribute('placeholder')
      const name = await input.getAttribute('name')
      const id = await input.getAttribute('id')
      console.log(`🔤 Input ${i + 1}: type=${type}, placeholder="${placeholder}", name=${name}, id=${id}`)
    }
    
    // Get all buttons
    const buttons = await page.locator('button').allTextContents()
    console.log('🔘 Button texts:', buttons)
    
    // Get page content
    const textContent = await page.textContent('body')
    console.log('📝 Page text content (first 1000 chars):', textContent?.substring(0, 1000))
    
    // Take a screenshot
    await page.screenshot({ path: 'debug-login.png', fullPage: true })
    console.log('📸 Screenshot saved as debug-login.png')
    
  } catch (error) {
    console.error('❌ Debug failed:', error)
  } finally {
    await browser.close()
  }
}

debugLoginForm().catch(console.error) 