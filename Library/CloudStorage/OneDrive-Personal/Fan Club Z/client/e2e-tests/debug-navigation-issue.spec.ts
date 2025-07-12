import { test, expect } from '@playwright/test'

test('should debug bottom navigation after demo login', async ({ page }) => {
  console.log('🔍 Starting bottom navigation debug test...')
  
  // Listen for console messages
  page.on('console', msg => {
    console.log('📟 BROWSER:', msg.text())
  })
  
  // Go to login page
  await page.goto('http://localhost:3000')
  console.log('📍 Current URL:', page.url())
  
  // Verify login page loads
  await expect(page.locator('text=Welcome to Fan Club Z')).toBeVisible()
  console.log('✅ Login page loaded')
  
  // Click demo login
  await page.locator('button:has-text("Try Demo")').click()
  console.log('🚀 Demo login clicked')
  
  // Wait for navigation and check what page we're on
  await page.waitForTimeout(3000)
  console.log('📍 URL after demo login:', page.url())
  
  // Check if we're on the main app or still on login
  const currentUrl = page.url()
  console.log('📍 Current URL after login:', currentUrl)
  
  // Check if compliance screen is showing
  const complianceVisible = await page.locator('text=Welcome to Fan Club Z').isVisible()
  console.log('🎯 Compliance screen visible:', complianceVisible)
  
  // Check if bottom navigation exists
  const bottomNavExists = await page.locator('[data-testid="bottom-navigation"]').isVisible()
  console.log('📱 Bottom navigation visible:', bottomNavExists)
  
  // Check if we're on discover page
  const discoverVisible = await page.locator('text=Discover').isVisible()
  console.log('🔍 Discover text visible:', discoverVisible)
  
  // Take a screenshot for debugging
  await page.screenshot({ path: 'debug-navigation-after-login.png' })
  console.log('📸 Screenshot saved: debug-navigation-after-login.png')
  
  // Check page content
  const pageContent = await page.content()
  console.log('📄 Page contains "Discover":', pageContent.includes('Discover'))
  console.log('📄 Page contains "bottom-navigation":', pageContent.includes('bottom-navigation'))
  console.log('📄 Page contains "showCompliance":', pageContent.includes('showCompliance'))
  
  // If we're still on login page, that's the issue
  if (currentUrl.includes('/auth/login')) {
    console.log('❌ Still on login page - demo login failed')
    throw new Error('Demo login failed - still on login page')
  }
  
  // If compliance is showing, that's the issue
  if (complianceVisible) {
    console.log('❌ Compliance screen still showing - compliance not completing')
    throw new Error('Compliance flow not completing')
  }
  
  // If bottom navigation is not visible, that's the issue
  if (!bottomNavExists) {
    console.log('❌ Bottom navigation not visible')
    throw new Error('Bottom navigation not rendering')
  }
  
  console.log('✅ All checks passed!')
}) 