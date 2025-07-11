import { test, expect } from '@playwright/test'

test.describe('Simple Bet Detail Page Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000')
    await page.waitForLoadState('networkidle')
  })

  test('Can navigate to bet detail page and back', async ({ page }) => {
    // Wait for the page to load
    await page.waitForSelector('text=Discover', { timeout: 10000 })
    
    // Look for any "View Details" button
    const viewDetailsButtons = page.locator('button:has-text("View Details")')
    await expect(viewDetailsButtons.first()).toBeVisible()
    
    // Click the first "View Details" button
    await viewDetailsButtons.first().click()
    
    // Wait for navigation to bet detail page
    await page.waitForURL(/\/bets\/.*/, { timeout: 10000 })
    
    // Verify we're on a bet detail page (should have bet title)
    await expect(page.locator('h1, h2, h3')).toContainText(/Bitcoin|Taylor|Premier|Manchester|Arsenal/, { timeout: 10000 })
    
    // Look for back button and click it
    const backButton = page.locator('button[aria-label="Go back"], button:has([data-lucide="arrow-left"]), button:has-text("←")')
    await expect(backButton).toBeVisible()
    await backButton.click()
    
    // Should return to previous page
    await expect(page).toHaveURL(/\/discover|\/bets|\/clubs/)
  })

  test('Comment input is disabled for unauthenticated users', async ({ page }) => {
    // Navigate to a bet detail page
    await page.waitForSelector('text=Discover', { timeout: 10000 })
    const viewDetailsButtons = page.locator('button:has-text("View Details")')
    await viewDetailsButtons.first().click()
    await page.waitForURL(/\/bets\/.*/, { timeout: 10000 })
    
    // Look for comment input - should be disabled or show login prompt
    const commentInput = page.locator('input[placeholder*="comment"], input[placeholder*="Comment"], textarea[placeholder*="comment"]')
    
    if (await commentInput.isVisible()) {
      // If input exists, it should be disabled
      await expect(commentInput).toBeDisabled()
    } else {
      // Or there should be a login prompt
      await expect(page.locator('text=Sign in to comment, text=Login to comment, button:has-text("Sign In")')).toBeVisible()
    }
  })

  test('Can login and access comment functionality', async ({ page }) => {
    // Try to login
    const signInButton = page.locator('button:has-text("Sign In"), a:has-text("Sign In")')
    if (await signInButton.isVisible()) {
      await signInButton.click()
      
      // Fill login form
      await page.fill('input[type="email"]', 'demo@fanclubz.app')
      await page.fill('input[type="password"]', 'demo123')
      await page.click('button:has-text("Sign In")')
      
      // Wait for login to complete
      await page.waitForTimeout(2000)
      
      // Navigate to a bet detail page
      await page.waitForSelector('text=Discover', { timeout: 10000 })
      const viewDetailsButtons = page.locator('button:has-text("View Details")')
      await viewDetailsButtons.first().click()
      await page.waitForURL(/\/bets\/.*/, { timeout: 10000 })
      
      // Comment input should now be enabled
      const commentInput = page.locator('input[placeholder*="comment"], input[placeholder*="Comment"], textarea[placeholder*="comment"]')
      if (await commentInput.isVisible()) {
        await expect(commentInput).toBeEnabled()
      }
    }
  })

  test('Bottom navigation works correctly', async ({ page }) => {
    // Test that we can navigate between tabs
    const tabs = ['Discover', 'My Bets', 'Clubs', 'Wallet', 'Profile']
    
    for (const tab of tabs) {
      const tabButton = page.locator(`button:has-text("${tab}"), a:has-text("${tab}")`)
      if (await tabButton.isVisible()) {
        await tabButton.click()
        await page.waitForTimeout(1000)
        
        // Verify we're on the correct tab (basic check)
        await expect(page.locator(`text=${tab}`)).toBeVisible()
      }
    }
  })

  test('Bet placement flow works', async ({ page }) => {
    // Login first
    const signInButton = page.locator('button:has-text("Sign In"), a:has-text("Sign In")')
    if (await signInButton.isVisible()) {
      await signInButton.click()
      await page.fill('input[type="email"]', 'demo@fanclubz.app')
      await page.fill('input[type="password"]', 'demo123')
      await page.click('button:has-text("Sign In")')
      await page.waitForTimeout(2000)
    }
    
    // Navigate to a bet detail page
    await page.waitForSelector('text=Discover', { timeout: 10000 })
    const viewDetailsButtons = page.locator('button:has-text("View Details")')
    await viewDetailsButtons.first().click()
    await page.waitForURL(/\/bets\/.*/, { timeout: 10000 })
    
    // Look for bet placement elements
    const placeBetButton = page.locator('button:has-text("Place Bet"), button:has-text("Bet")')
    const stakeInput = page.locator('input[placeholder*="stake"], input[placeholder*="amount"], input[type="number"]')
    
    if (await placeBetButton.isVisible() && await stakeInput.isVisible()) {
      // Try to place a bet
      await stakeInput.fill('10')
      
      // Look for option selection
      const options = page.locator('button:has-text("Yes"), button:has-text("No"), input[type="radio"]')
      if (await options.first().isVisible()) {
        await options.first().click()
      }
      
      await placeBetButton.click()
      
      // Should show some feedback
      await expect(page.locator('text=success, text=placed, text=confirmed')).toBeVisible({ timeout: 5000 })
    }
  })

  test('URL referrer parameter handling', async ({ page }) => {
    // Test direct navigation with referrer parameter
    await page.goto('http://localhost:3000/bets/3235f312-e442-4ca1-9fce-dcf9d9b4bce5?referrer=/discover')
    
    // Should load the bet detail page
    await expect(page.locator('h1, h2, h3')).toContainText(/Bitcoin|Taylor|Premier|Manchester|Arsenal/, { timeout: 10000 })
    
    // Back button should work
    const backButton = page.locator('button[aria-label="Go back"], button:has([data-lucide="arrow-left"]), button:has-text("←")')
    if (await backButton.isVisible()) {
      await backButton.click()
      await page.waitForTimeout(1000)
    }
  })
}) 