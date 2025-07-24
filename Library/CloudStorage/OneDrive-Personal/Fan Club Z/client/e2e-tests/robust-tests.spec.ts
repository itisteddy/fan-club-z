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
  })

  test('should show login page for unauthenticated users', async ({ page }) => {
    // Should be on login page
    await expect(page.locator('text=Welcome to Fan Club Z')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('input[type="password"]')).toBeVisible({ timeout: 5000 })
  })

  // Skip all authentication-dependent tests until proper test auth is set up
  test.skip('Authentication required tests are skipped until test setup is complete')
}) 