import { test, expect } from '@playwright/test'

test.describe('Validate Demo Login Fixes', () => {
  test('should validate demo login and navigation work', async ({ page }) => {
    console.log('🔍 Starting validation test...')
    
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
    
    // Wait for navigation and check if we're on the main app
    await page.waitForTimeout(2000)
    console.log('📍 URL after demo login:', page.url())
    
    // Check if bottom navigation appears (this was the main issue)
    const bottomNav = page.locator('[data-testid="bottom-navigation"]')
    await expect(bottomNav).toBeVisible({ timeout: 10000 })
    console.log('✅ Bottom navigation found!')
    
    // Check if we're on discover page
    await expect(page.locator('text=Discover')).toBeVisible()
    console.log('✅ Discover page loaded')
    
    // Check if bet cards are visible
    const betCards = page.locator('[data-testid="bet-card"]')
    await expect(betCards.first()).toBeVisible({ timeout: 5000 })
    console.log('✅ Bet cards loaded')
    
    // Test navigation to Profile tab
    await page.locator('[data-testid="bottom-navigation"] >> text=Profile').click()
    await expect(page.locator('text=Demo User')).toBeVisible()
    console.log('✅ Profile page loaded with Demo User')
    
    // Test navigation to Wallet tab
    await page.locator('[data-testid="bottom-navigation"] >> text=Wallet').click()
    await expect(page.locator('text=Available Balance')).toBeVisible()
    console.log('✅ Wallet page loaded')
    
    // Test navigation to Clubs tab
    await page.locator('[data-testid="bottom-navigation"] >> text=Clubs').click()
    await expect(page.locator('text=Clubs')).toBeVisible()
    console.log('✅ Clubs page loaded')
    
    // Test navigation back to Discover
    await page.locator('[data-testid="bottom-navigation"] >> text=Discover').click()
    await expect(page.locator('text=Discover')).toBeVisible()
    console.log('✅ Navigation back to Discover works')
    
    console.log('🎉 All navigation tests passed!')
  })
}) 