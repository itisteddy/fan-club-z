import { test, expect } from '@playwright/test'

test.describe('Debug Navigation Issue', () => {
  test('should debug demo login and navigation', async ({ page }) => {
    console.log('🔍 Starting debug test...')
    
    // Listen for console messages
    page.on('console', msg => {
      console.log('📟 BROWSER:', msg.text())
    })
    
    // Listen for errors
    page.on('pageerror', error => {
      console.log('❌ BROWSER ERROR:', error.message)
    })
    
    // Go to login page
    await page.goto('http://localhost:3000')
    console.log('📍 Current URL:', page.url())
    
    // Check if we're on login page
    await expect(page.locator('text=Welcome to Fan Club Z')).toBeVisible()
    console.log('✅ Login page loaded')
    
    // Click demo login
    await page.locator('button:has-text("Try Demo")').click()
    console.log('🚀 Demo login clicked')
    
    // Wait a bit and check what page we're on
    await page.waitForTimeout(3000)
    console.log('📍 URL after demo login:', page.url())
    
    // Check if compliance screen is showing
    const complianceText = page.locator('text=Welcome to Fan Club Z')
    const isComplianceVisible = await complianceText.isVisible()
    console.log('🔍 Compliance screen visible:', isComplianceVisible)
    
    if (isComplianceVisible) {
      console.log('🧪 In test environment, compliance should show')
      
      // Check if Get Started button exists
      const getStartedButton = page.locator('button:has-text("Get Started")')
      const buttonExists = await getStartedButton.isVisible()
      console.log('🔍 Get Started button visible:', buttonExists)
      
      // Check if the button element exists in DOM even if not visible
      const buttonInDOM = page.locator('button:has-text("Get Started")')
      const buttonCount = await buttonInDOM.count()
      console.log('🔍 Get Started buttons in DOM:', buttonCount)
      
      // Check what's actually on the page
      const pageContent = await page.content()
      console.log('🔍 Page contains "Get Started":', pageContent.includes('Get Started'))
      console.log('🔍 Page contains "ComplianceManager":', pageContent.includes('ComplianceManager'))
      console.log('🔍 Page contains "renderWelcome":', pageContent.includes('renderWelcome'))
      
      if (buttonExists) {
        console.log('✅ Get Started button found, clicking...')
        await getStartedButton.click()
        
        // Wait and check what happens
        await page.waitForTimeout(2000)
        console.log('📍 URL after clicking Get Started:', page.url())
        
        // Check if we're now on terms page
        const termsText = page.locator('text=Terms of Service')
        const isTermsVisible = await termsText.isVisible()
        console.log('🔍 Terms page visible:', isTermsVisible)
      }
    } else {
      console.log('🎯 Not in test environment, should skip compliance')
      
      // Check if bottom navigation appears
      await page.waitForTimeout(2000)
      const bottomNav = page.locator('[data-testid="bottom-navigation"]')
      const navVisible = await bottomNav.isVisible()
      console.log('🔍 Bottom navigation visible:', navVisible)
      
      if (navVisible) {
        console.log('✅ Bottom navigation found!')
        
        // Check if we can see the tabs
        const discoverTab = page.locator('[data-testid="bottom-navigation"] >> text=Discover')
        const discoverVisible = await discoverTab.isVisible()
        console.log('🔍 Discover tab visible:', discoverVisible)
      } else {
        console.log('❌ Bottom navigation not found')
        
        // Check what's actually on the page
        const pageContent = await page.content()
        console.log('🔍 Page contains "bottom-navigation":', pageContent.includes('bottom-navigation'))
        console.log('🔍 Page contains "ComplianceManager":', pageContent.includes('ComplianceManager'))
      }
    }
    
    // Take a screenshot for debugging
    await page.screenshot({ path: 'debug-navigation.png', fullPage: true })
    console.log('📸 Screenshot saved as debug-navigation.png')
  })
}) 