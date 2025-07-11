import { test, expect } from '@playwright/test'

test.describe('Fan Club Z - Basic Functionality Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000')
    await page.waitForLoadState('networkidle')
  })

  test('should display login page', async ({ page }) => {
    await expect(page.locator('text=Welcome to Fan Club Z')).toBeVisible()
    await expect(page.locator('button:has-text("Try Demo")')).toBeVisible()
  })

  test('should allow demo login and show main app', async ({ page }) => {
    // Click demo login
    await page.locator('button:has-text("Try Demo")').click()
    
    // Wait for navigation
    await page.waitForLoadState('networkidle')
    
    // Should show main app with bottom navigation
    await expect(page.locator('[data-testid="bottom-navigation"]')).toBeVisible()
  })

  test('should navigate between tabs', async ({ page }) => {
    // Login first
    await page.locator('button:has-text("Try Demo")').click()
    await page.waitForLoadState('networkidle')
    
    // Check Discover tab (default)
    await expect(page.locator('text=Discover')).toBeVisible()
    
    // Navigate to My Bets
    await page.locator('[data-testid="bottom-navigation"] >> text=My Bets').click()
    await expect(page.locator('text=My Bets')).toBeVisible()
    
    // Navigate to Clubs
    await page.locator('[data-testid="bottom-navigation"] >> text=Clubs').click()
    await expect(page.locator('text=Clubs')).toBeVisible()
    
    // Navigate to Wallet
    await page.locator('[data-testid="bottom-navigation"] >> text=Wallet').click()
    await expect(page.locator('text=Wallet')).toBeVisible()
    
    // Navigate to Profile
    await page.locator('[data-testid="bottom-navigation"] >> text=Profile').click()
    await expect(page.locator('text=Profile')).toBeVisible()
  })

  test('should display bet cards on discover page', async ({ page }) => {
    // Login first
    await page.locator('button:has-text("Try Demo")').click()
    await page.waitForLoadState('networkidle')
    
    // Should show bet cards
    await expect(page.locator('[data-testid="bet-card"]')).toHaveCount(3)
  })

  test('should show user stats on profile page', async ({ page }) => {
    // Login first
    await page.locator('button:has-text("Try Demo")').click()
    await page.waitForLoadState('networkidle')
    
    // Navigate to profile
    await page.locator('[data-testid="bottom-navigation"] >> text=Profile').click()
    
    // Should show user info
    await expect(page.locator('text=Demo User')).toBeVisible()
    await expect(page.locator('text=demo@fanclubz.app')).toBeVisible()
  })

  test('should show wallet balance', async ({ page }) => {
    // Login first
    await page.locator('button:has-text("Try Demo")').click()
    await page.waitForLoadState('networkidle')
    
    // Navigate to wallet
    await page.locator('[data-testid="bottom-navigation"] >> text=Wallet').click()
    
    // Should show balance
    await expect(page.locator('text=Available Balance')).toBeVisible()
    await expect(page.locator('text=$2,500.00')).toBeVisible()
  })

  test('should show clubs on clubs page', async ({ page }) => {
    // Login first
    await page.locator('button:has-text("Try Demo")').click()
    await page.waitForLoadState('networkidle')
    
    // Navigate to clubs
    await page.locator('[data-testid="bottom-navigation"] >> text=Clubs').click()
    
    // Should show clubs
    await expect(page.locator('text=Discover')).toBeVisible()
    await expect(page.locator('text=My Clubs')).toBeVisible()
  })
}) 