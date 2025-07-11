import { chromium } from 'playwright'

async function debugPageContent() {
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
    console.log('🔍 Debugging page content...')
    
    // Navigate to the app
    await page.goto('http://localhost:3000')
    console.log('✅ App loaded')
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle')
    
    // Get page title
    const title = await page.title()
    console.log('📄 Page title:', title)
    
    // Get all text content
    const textContent = await page.textContent('body')
    console.log('📝 Page text content (first 500 chars):', textContent?.substring(0, 500))
    
    // Check for forms
    const forms = await page.locator('form').count()
    console.log('📋 Number of forms:', forms)
    
    // Check for inputs
    const inputs = await page.locator('input').count()
    console.log('🔤 Number of inputs:', inputs)
    
    // Check for buttons
    const buttons = await page.locator('button').count()
    console.log('🔘 Number of buttons:', buttons)
    
    // List all buttons
    const buttonTexts = await page.locator('button').allTextContents()
    console.log('🔘 Button texts:', buttonTexts)
    
    // Check for specific elements
    const elements = [
      'text=Login',
      'text=Sign In',
      'text=Email',
      'text=Password',
      'text=Welcome',
      'text=Discover',
      'text=Profile'
    ]
    
    for (const element of elements) {
      const found = await page.locator(element).count()
      console.log(`🔍 ${element}: ${found} found`)
    }
    
    // Take a screenshot
    await page.screenshot({ path: 'debug-page.png', fullPage: true })
    console.log('📸 Screenshot saved as debug-page.png')
    
  } catch (error) {
    console.error('❌ Debug failed:', error)
  } finally {
    await browser.close()
  }
}

debugPageContent().catch(console.error) 