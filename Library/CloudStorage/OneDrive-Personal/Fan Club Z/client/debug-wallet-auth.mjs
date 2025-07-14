import { chromium } from 'playwright'

async function debugWalletAuth() {
  const browser = await chromium.launch({ headless: false })
  const page = await browser.newPage()
  
  try {
    console.log('🔍 Starting comprehensive wallet auth debug...')
    
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
    
    // Check localStorage for auth token
    const authToken = await page.evaluate(() => localStorage.getItem('auth_token'))
    console.log('🔑 Auth token in localStorage:', authToken ? 'Present' : 'Missing', '| Value:', authToken)
    
    // Check if user data is in localStorage
    const userData = await page.evaluate(() => {
      const authStore = localStorage.getItem('fan-club-z-auth')
      return authStore ? JSON.parse(authStore) : null
    })
    console.log('👤 User data in localStorage:', userData)
    
    // Check if bottom navigation is visible
    const bottomNav = await page.locator('[data-testid="bottom-navigation"]')
    const isBottomNavVisible = await bottomNav.isVisible()
    console.log('🧭 Bottom navigation visible:', isBottomNavVisible)
    
    if (isBottomNavVisible) {
      // Check if Wallet tab is in bottom navigation
      const walletTab = await page.locator('[data-testid="bottom-navigation"] >> text=Wallet')
      const isWalletTabVisible = await walletTab.isVisible()
      console.log('💰 Wallet tab visible:', isWalletTabVisible)
      
      if (isWalletTabVisible) {
        console.log('🎯 Attempting to click Wallet tab...')
        
        // Click the Wallet tab
        await walletTab.click()
        console.log('✅ Wallet tab clicked')
        
        // Wait a moment for navigation
        await page.waitForTimeout(2000)
        
        // Check URL after click
        const urlAfterClick = page.url()
        console.log('📍 URL after Wallet click:', urlAfterClick)
        
        // Check if we're still on login page
        const isLoginPage = await page.locator('button:has-text("Try Demo")').isVisible()
        console.log('🔐 Still on login page:', isLoginPage)
        
        // Check if wallet page loaded
        const isWalletPage = await page.locator('header h1:has-text("Wallet")').isVisible().catch(() => false)
        console.log('💰 Wallet page loaded:', isWalletPage)
        
        // Check for any error messages
        const errorMessages = await page.locator('.text-red-500, .text-red-600, [role="alert"]').allTextContents()
        console.log('❌ Error messages found:', errorMessages)
        
        // Check console logs for authentication info
        const logs = await page.evaluate(() => {
          return window.consoleLogs || []
        })
        console.log('📝 Console logs:', logs.slice(-10)) // Last 10 logs
      }
    }
    
    console.log('🔍 Debug complete')
    
  } catch (error) {
    console.error('❌ Debug failed:', error)
  } finally {
    await browser.close()
  }
}

debugWalletAuth() 