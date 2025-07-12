import { test, expect } from '@playwright/test'

test.describe('Fan Club Z - Robust E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Clear all storage and cookies before each test
    await page.goto('http://localhost:3000')
    await page.evaluate(() => {
      localStorage.clear()
      sessionStorage.clear()
    })
    await page.reload()
    
    // Wait for the app to fully load
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(3000) // Extra wait for React to hydrate
    
    // Debug: Check what's actually on the page
    const pageContent = await page.content()
    console.log('Page URL:', page.url())
    console.log('Page title:', await page.title())
    
    // Check if we're on the login page
    const hasLoginText = await page.locator('text=Welcome to Fan Club Z').isVisible()
    console.log('Login page visible:', hasLoginText)
    
    // Check if demo button exists
    const hasDemoButton = await page.locator('[data-testid="demo-login-button"]').isVisible()
    console.log('Demo button visible:', hasDemoButton)
  })

  test('should show login page for unauthenticated users', async ({ page }) => {
    // Should be on login page
    await expect(page.locator('text=Welcome to Fan Club Z')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('[data-testid="demo-login-button"]')).toBeVisible({ timeout: 10000 })
  })

  test('should allow demo login and navigate to main app', async ({ page }) => {
    // Wait for demo button to be visible
    await page.waitForSelector('[data-testid="demo-login-button"]', { timeout: 10000 })
    
    // Click demo login
    await page.locator('[data-testid="demo-login-button"]').click()
    
    // Wait for navigation and loading
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(3000) // Extra wait for auth to complete
    
    // Should show main app with bottom navigation
    await expect(page.locator('[data-testid="bottom-navigation"]')).toBeVisible({ timeout: 10000 })
    
    // Should be on discover page - check the page header, not navigation
    await expect(page.locator('header h1:has-text("Discover")')).toBeVisible({ timeout: 10000 })
  })

  test('should navigate between all tabs after login', async ({ page }) => {
    // Wait for demo button and login
    await page.waitForSelector('[data-testid="demo-login-button"]', { timeout: 10000 })
    await page.locator('[data-testid="demo-login-button"]').click()
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(3000)
    
    // Navigate to My Bets - target the navigation button specifically
    await page.locator('[data-testid="bottom-navigation"] >> text=My Bets').click()
    await expect(page.locator('header h1:has-text("My Bets")')).toBeVisible({ timeout: 10000 })
    
    // Navigate to Clubs - target the navigation button specifically
    await page.locator('[data-testid="bottom-navigation"] >> text=Clubs').click()
    await expect(page.locator('header h1:has-text("Clubs")')).toBeVisible({ timeout: 10000 })
    
    // Navigate to Wallet - target the navigation button specifically
    await page.locator('[data-testid="bottom-navigation"] >> text=Wallet').click()
    await expect(page.locator('header h1:has-text("Wallet")')).toBeVisible({ timeout: 10000 })
    
    // Navigate to Profile - target the navigation button specifically
    await page.locator('[data-testid="bottom-navigation"] >> text=Profile').click()
    await expect(page.locator('header h1:has-text("Profile")')).toBeVisible({ timeout: 10000 })
    
    // Navigate back to Discover - target the navigation button specifically
    await page.locator('[data-testid="bottom-navigation"] >> text=Discover').click()
    await expect(page.locator('header h1:has-text("Discover")')).toBeVisible({ timeout: 10000 })
  })

  test('should display bet cards on discover page', async ({ page }) => {
    // Login first
    await page.waitForSelector('[data-testid="demo-login-button"]', { timeout: 10000 })
    await page.locator('[data-testid="demo-login-button"]').click()
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(3000)
    
    // Should show at least 1 bet card
    const betCards = page.locator('[data-testid="bet-card"]')
    await expect(betCards.first()).toBeVisible({ timeout: 10000 })
    const count = await betCards.count()
    expect(count).toBeGreaterThan(0)
  })

  test('should show user profile information', async ({ page }) => {
    // Login first
    await page.waitForSelector('[data-testid="demo-login-button"]', { timeout: 10000 })
    await page.locator('[data-testid="demo-login-button"]').click()
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(3000)
    
    // Navigate to profile
    await page.locator('[data-testid="bottom-navigation"] >> text=Profile').click()
    
    // Wait for profile page to load
    await expect(page.locator('header h1:has-text("Profile")')).toBeVisible({ timeout: 10000 })
    
    // Should show user info
    await expect(page.locator('text=Demo User')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('text=demo@fanclubz.app')).toBeVisible({ timeout: 10000 })
  })

  test('should show wallet balance', async ({ page }) => {
    // Login first
    await page.waitForSelector('[data-testid="demo-login-button"]', { timeout: 10000 })
    await page.locator('[data-testid="demo-login-button"]').click()
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(3000)
    
    // Navigate to wallet
    await page.locator('[data-testid="bottom-navigation"] >> text=Wallet').click()
    
    // Wait for wallet page to load
    await expect(page.locator('header h1:has-text("Wallet")')).toBeVisible({ timeout: 10000 })
    
    // Should show balance
    await expect(page.locator('text=Available Balance')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('text=$2,500.00')).toBeVisible({ timeout: 10000 })
  })

  test('should show clubs page', async ({ page }) => {
    // Login first
    await page.waitForSelector('[data-testid="demo-login-button"]', { timeout: 10000 })
    await page.locator('[data-testid="demo-login-button"]').click()
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(3000)
    
    // Navigate to clubs
    await page.locator('[data-testid="bottom-navigation"] >> text=Clubs').click()
    
    // Wait for clubs page to load
    await expect(page.locator('header h1:has-text("Clubs")')).toBeVisible({ timeout: 10000 })
    
    // Should show clubs content (avoid conflicting "Discover" text)
    await expect(page.locator('text=My Clubs')).toBeVisible({ timeout: 10000 })
  })

  test('should allow placing a bet', async ({ page }) => {
    // Login first
    await page.waitForSelector('[data-testid="demo-login-button"]', { timeout: 10000 })
    await page.locator('[data-testid="demo-login-button"]').click()
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(3000)
    
    // Click on a bet card
    await page.locator('[data-testid="bet-card"]').first().click()
    
    // Should be on bet detail page
    await expect(page.locator('h1')).toContainText('Taylor Swift announces surprise album?', { timeout: 10000 })
    
    // Place a bet
    await page.locator('button:has-text("Yes, she will")').click()
    await page.locator('input[placeholder="Amount"]').fill('10')
    await page.locator('button:has-text("Place Bet")').click()
    
    // Should show success
    await expect(page.locator('text=Bet placed successfully')).toBeVisible({ timeout: 10000 })
  })

  test('should update My Bets after placing bet', async ({ page }) => {
    // Login first
    await page.waitForSelector('[data-testid="demo-login-button"]', { timeout: 10000 })
    await page.locator('[data-testid="demo-login-button"]').click()
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(3000)
    
    // Place a bet first
    await page.locator('[data-testid="bet-card"]').first().click()
    await page.locator('button:has-text("Yes, she will")').click()
    await page.locator('input[placeholder="Amount"]').fill('15')
    await page.locator('button:has-text("Place Bet")').click()
    await page.waitForTimeout(2000)
    
    // Navigate to My Bets
    await page.locator('[data-testid="bottom-navigation"] >> text=My Bets').click()
    
    // Wait for My Bets page to load
    await expect(page.locator('header h1:has-text("My Bets")')).toBeVisible({ timeout: 10000 })
    
    // Should show the bet count
    await expect(page.locator('text=1')).toBeVisible({ timeout: 10000 }) // Active bets count
  })

  test('should show active tab indicator', async ({ page }) => {
    // Login first
    await page.waitForSelector('[data-testid="demo-login-button"]', { timeout: 10000 })
    await page.locator('[data-testid="demo-login-button"]').click()
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(3000)
    
    // Check that Discover tab is active initially
    await expect(page.locator('[data-testid="bottom-navigation"] >> text=Discover').first()).toHaveClass(/text-blue-500/)
    
    // Navigate to My Bets and check it becomes active
    await page.locator('[data-testid="bottom-navigation"] >> text=My Bets').click()
    await expect(page.locator('header h1:has-text("My Bets")')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('[data-testid="bottom-navigation"] >> text=My Bets').first()).toHaveClass(/text-blue-500/)
    
    // Navigate to Clubs and check it becomes active
    await page.locator('[data-testid="bottom-navigation"] >> text=Clubs').click()
    await expect(page.locator('header h1:has-text("Clubs")')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('[data-testid="bottom-navigation"] >> text=Clubs').first()).toHaveClass(/text-blue-500/)
  })
}) 