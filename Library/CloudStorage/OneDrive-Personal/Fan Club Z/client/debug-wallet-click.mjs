import { chromium } from 'playwright'

async function debugWalletClick() {
  const browser = await chromium.launch({ headless: false })
  const page = await browser.newPage()
  
  try {
    console.log('🔍 Testing different Wallet tab click strategies...')
    
    // Navigate to the app
    await page.goto('http://localhost:3000')
    console.log('✅ Navigated to app')
    
    // Wait for login page to load
    await page.waitForSelector('button:has-text("Try Demo")', { timeout: 10000 })
    console.log('✅ Demo button found')
    
    // Click demo login
    await page.click('button:has-text("Try Demo")')
    console.log('✅ Clicked demo login')
    
    // Wait for navigation to complete
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(3000)
    console.log('✅ Navigation completed')
    
    // Check current URL
    const currentUrl = page.url()
    console.log('📍 Current URL:', currentUrl)
    
    // Strategy 1: Click on the button element directly
    console.log('🎯 Strategy 1: Clicking button element...')
    try {
      const walletButton = await page.locator('[data-testid="bottom-navigation"] button').filter({ hasText: 'Wallet' })
      await walletButton.click({ timeout: 5000 })
      console.log('✅ Strategy 1: Button click successful')
    } catch (error) {
      console.log('❌ Strategy 1 failed:', error.message)
    }
    
    await page.waitForTimeout(2000)
    console.log('📍 URL after Strategy 1:', page.url())
    
    // Strategy 2: Click on the span text
    console.log('🎯 Strategy 2: Clicking span text...')
    try {
      const walletSpan = await page.locator('[data-testid="bottom-navigation"] span').filter({ hasText: 'Wallet' })
      await walletSpan.click({ timeout: 5000 })
      console.log('✅ Strategy 2: Span click successful')
    } catch (error) {
      console.log('❌ Strategy 2 failed:', error.message)
    }
    
    await page.waitForTimeout(2000)
    console.log('📍 URL after Strategy 2:', page.url())
    
    // Strategy 3: Use force click
    console.log('🎯 Strategy 3: Force clicking...')
    try {
      const walletElement = await page.locator('[data-testid="bottom-navigation"] >> text=Wallet')
      await walletElement.click({ force: true, timeout: 5000 })
      console.log('✅ Strategy 3: Force click successful')
    } catch (error) {
      console.log('❌ Strategy 3 failed:', error.message)
    }
    
    await page.waitForTimeout(2000)
    console.log('📍 URL after Strategy 3:', page.url())
    
    // Strategy 4: Direct navigation to wallet URL
    console.log('🎯 Strategy 4: Direct navigation to /wallet...')
    try {
      await page.goto('http://localhost:3000/wallet')
      console.log('✅ Strategy 4: Direct navigation successful')
    } catch (error) {
      console.log('❌ Strategy 4 failed:', error.message)
    }
    
    await page.waitForTimeout(2000)
    console.log('📍 URL after Strategy 4:', page.url())
    
    // Check if wallet page loaded
    const isWalletPage = await page.locator('header h1:has-text("Wallet")').isVisible().catch(() => false)
    console.log('💰 Wallet page loaded:', isWalletPage)
    
    // Check for any error messages
    const errorMessages = await page.locator('.text-red-500, .text-red-600, [role="alert"]').allTextContents()
    console.log('❌ Error messages found:', errorMessages)
    
    console.log('🔍 Click strategies debug complete')
    
  } catch (error) {
    console.error('❌ Debug failed:', error)
  } finally {
    await browser.close()
  }
}

debugWalletClick() 