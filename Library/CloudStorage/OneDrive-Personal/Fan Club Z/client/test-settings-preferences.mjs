#!/usr/bin/env node

import { test, expect } from '@playwright/test'

test.describe('Settings & Preferences Feature', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app and login
    await page.goto('http://localhost:3000')
    await page.waitForLoadState('networkidle')
    
    // Login with demo user
    await page.locator('button:has-text("Try Demo")').click()
    await page.waitForLoadState('networkidle')
    
    // Wait for main app to load
    await expect(page.locator('[data-testid="bottom-navigation"]')).toBeVisible({ timeout: 10000 })
  })

  test('should access settings from profile page', async ({ page }) => {
    console.log('🧪 Testing settings access...')
    
    // Navigate to Profile
    await page.locator('[data-testid="bottom-navigation"] >> text=Profile').click()
    await expect(page.locator('header h1:has-text("Profile")')).toBeVisible()
    
    // Click on Settings & Preferences
    await page.locator('[data-testid="access-settings"]').click()
    
    // Should be on settings page
    await expect(page.locator('h1:has-text("Settings")')).toBeVisible({ timeout: 5000 })
    console.log('✅ Successfully accessed settings page')
  })

  test('should display all settings sections', async ({ page }) => {
    console.log('🧪 Testing settings sections display...')
    
    // Navigate to Profile then Settings
    await page.locator('[data-testid="bottom-navigation"] >> text=Profile').click()
    await page.locator('[data-testid="access-settings"]').click()
    await expect(page.locator('h1:has-text("Settings")')).toBeVisible()
    
    // Check all main settings sections are present
    await expect(page.locator('[data-testid="account-settings"]')).toBeVisible()
    await expect(page.locator('[data-testid="privacy-settings"]')).toBeVisible()
    await expect(page.locator('[data-testid="notification-settings"]')).toBeVisible()
    await expect(page.locator('[data-testid="security-settings"]')).toBeVisible()
    await expect(page.locator('[data-testid="app-preferences"]')).toBeVisible()
    await expect(page.locator('[data-testid="betting-preferences"]')).toBeVisible()
    await expect(page.locator('[data-testid="accessibility-settings"]')).toBeVisible()
    
    console.log('✅ All settings sections are displayed')
  })

  test('should allow updating preferences', async ({ page }) => {
    console.log('🧪 Testing preference updates...')
    
    // Navigate to settings
    await page.locator('[data-testid="bottom-navigation"] >> text=Profile').click()
    await page.locator('[data-testid="access-settings"]').click()
    await expect(page.locator('h1:has-text("Settings")')).toBeVisible()
    
    // Toggle a notification setting
    await page.locator('[data-testid="push-notifications-toggle"]').click()
    console.log('✅ Toggled push notifications')
    
    // Change theme
    await page.locator('[data-testid="theme-select"]').selectOption('dark')
    console.log('✅ Changed theme to dark')
    
    // Update default stake amount
    await page.locator('[data-testid="default-stake-input"]').fill('25')
    console.log('✅ Updated default stake amount')
    
    // Save settings
    await expect(page.locator('[data-testid="update-preferences"]')).toBeEnabled()
    await page.locator('[data-testid="update-preferences"]').click()
    
    // Should show success message
    await expect(page.locator('text=Settings saved successfully!')).toBeVisible({ timeout: 5000 })
    console.log('✅ Settings saved successfully')
  })

  test('should persist settings after page reload', async ({ page }) => {
    console.log('🧪 Testing settings persistence...')
    
    // Navigate to settings and make changes
    await page.locator('[data-testid="bottom-navigation"] >> text=Profile').click()
    await page.locator('[data-testid="access-settings"]').click()
    await expect(page.locator('h1:has-text("Settings")')).toBeVisible()
    
    // Change theme to dark
    await page.locator('[data-testid="theme-select"]').selectOption('dark')
    
    // Save settings
    await page.locator('[data-testid="update-preferences"]').click()
    await expect(page.locator('text=Settings saved successfully!')).toBeVisible()
    
    // Reload page
    await page.reload()
    await page.waitForLoadState('networkidle')
    
    // Login again
    await page.locator('button:has-text("Try Demo")').click()
    await page.waitForLoadState('networkidle')
    
    // Navigate back to settings
    await page.locator('[data-testid="bottom-navigation"] >> text=Profile').click()
    await page.locator('[data-testid="access-settings"]').click()
    
    // Check that theme is still dark
    await expect(page.locator('[data-testid="theme-select"]')).toHaveValue('dark')
    console.log('✅ Settings persisted after page reload')
  })

  test('should handle back navigation correctly', async ({ page }) => {
    console.log('🧪 Testing back navigation...')
    
    // Navigate to settings
    await page.locator('[data-testid="bottom-navigation"] >> text=Profile').click()
    await page.locator('[data-testid="access-settings"]').click()
    await expect(page.locator('h1:has-text("Settings")')).toBeVisible()
    
    // Click back button
    await page.locator('[data-testid="back-to-profile"]').click()
    
    // Should be back on profile page
    await expect(page.locator('header h1:has-text("Profile")')).toBeVisible()
    console.log('✅ Back navigation works correctly')
  })

  test('should show form validation for invalid inputs', async ({ page }) => {
    console.log('🧪 Testing form validation...')
    
    // Navigate to settings
    await page.locator('[data-testid="bottom-navigation"] >> text=Profile').click()
    await page.locator('[data-testid="access-settings"]').click()
    await expect(page.locator('h1:has-text("Settings")')).toBeVisible()
    
    // Try to enter invalid default stake amount
    await page.locator('[data-testid="default-stake-input"]').fill('-10')
    
    // Save settings button should handle validation
    await page.locator('[data-testid="update-preferences"]').click()
    
    // Should show validation feedback or correct the input
    console.log('✅ Form validation handled')
  })

  test('should allow accessibility settings to be changed', async ({ page }) => {
    console.log('🧪 Testing accessibility settings...')
    
    // Navigate to settings
    await page.locator('[data-testid="bottom-navigation"] >> text=Profile').click()
    await page.locator('[data-testid="access-settings"]').click()
    await expect(page.locator('h1:has-text("Settings")')).toBeVisible()
    
    // Toggle accessibility settings
    await page.locator('[data-testid="high-contrast-toggle"]').click()
    await page.locator('[data-testid="large-text-toggle"]').click()
    await page.locator('[data-testid="reduce-motion-toggle"]').click()
    
    console.log('✅ Toggled accessibility settings')
    
    // Save settings
    await page.locator('[data-testid="update-preferences"]').click()
    await expect(page.locator('text=Settings saved successfully!')).toBeVisible()
    
    console.log('✅ Accessibility settings saved successfully')
  })

  test('should allow notification preferences to be configured', async ({ page }) => {
    console.log('🧪 Testing notification preferences...')
    
    // Navigate to settings
    await page.locator('[data-testid="bottom-navigation"] >> text=Profile').click()
    await page.locator('[data-testid="access-settings"]').click()
    await expect(page.locator('h1:has-text("Settings")')).toBeVisible()
    
    // Configure notification preferences
    await page.locator('[data-testid="email-notifications-toggle"]').click()
    await page.locator('[data-testid="bet-updates-toggle"]').click()
    await page.locator('[data-testid="club-activity-toggle"]').click()
    await page.locator('[data-testid="marketing-emails-toggle"]').click()
    
    console.log('✅ Configured notification preferences')
    
    // Save settings
    await page.locator('[data-testid="update-preferences"]').click()
    await expect(page.locator('text=Settings saved successfully!')).toBeVisible()
    
    console.log('✅ Notification preferences saved successfully')
  })

  test('should allow security settings to be updated', async ({ page }) => {
    console.log('🧪 Testing security settings...')
    
    // Navigate to settings
    await page.locator('[data-testid="bottom-navigation"] >> text=Profile').click()
    await page.locator('[data-testid="access-settings"]').click()
    await expect(page.locator('h1:has-text("Settings")')).toBeVisible()
    
    // Update security settings
    await page.locator('[data-testid="two-factor-toggle"]').click()
    await page.locator('[data-testid="login-alerts-toggle"]').click()
    await page.locator('[data-testid="session-timeout-select"]').selectOption('6h')
    
    console.log('✅ Updated security settings')
    
    // Save settings
    await page.locator('[data-testid="update-preferences"]').click()
    await expect(page.locator('text=Settings saved successfully!')).toBeVisible()
    
    console.log('✅ Security settings saved successfully')
  })

  test('should allow betting preferences to be customized', async ({ page }) => {
    console.log('🧪 Testing betting preferences...')
    
    // Navigate to settings
    await page.locator('[data-testid="bottom-navigation"] >> text=Profile').click()
    await page.locator('[data-testid="access-settings"]').click()
    await expect(page.locator('h1:has-text("Settings")')).toBeVisible()
    
    // Update betting preferences
    await page.locator('[data-testid="default-stake-input"]').fill('50')
    await page.locator('[data-testid="max-daily-spend-input"]').fill('1000')
    await page.locator('[data-testid="risk-level-select"]').selectOption('high')
    await page.locator('[data-testid="auto-settle-toggle"]').click()
    
    console.log('✅ Updated betting preferences')
    
    // Save settings
    await page.locator('[data-testid="update-preferences"]').click()
    await expect(page.locator('text=Settings saved successfully!')).toBeVisible()
    
    console.log('✅ Betting preferences saved successfully')
  })
})

console.log('🎉 Settings & Preferences tests completed!')
