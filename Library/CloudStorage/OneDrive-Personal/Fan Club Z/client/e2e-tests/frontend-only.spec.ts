import { test, expect } from '@playwright/test'

test.describe('Frontend-Only Tests', () => {
  test('should validate UI components without backend', async ({ page }) => {
    console.log('🔍 Starting frontend-only test...')
    
    // Mock the demo user data in localStorage before loading the page
    await page.addInitScript(() => {
      // Mock demo user authentication
      const mockUser = {
        id: 'demo-user-id',
        email: 'demo@fanclubz.app',
        firstName: 'Demo',
        lastName: 'User',
        username: 'demo_user',
        profileImage: null,
        bio: 'Demo user for testing',
        dateOfBirth: '1990-01-01',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      
      const mockAuthState = {
        user: mockUser,
        isAuthenticated: true,
        token: 'mock-token'
      }
      
      localStorage.setItem('fan-club-z-auth', JSON.stringify({ state: mockAuthState }))
      
      // Mock compliance status
      const mockCompliance = {
        ageVerified: true,
        privacyAccepted: true,
        termsAccepted: true,
        responsibleGamblingAcknowledged: true,
        completedAt: new Date().toISOString()
      }
      localStorage.setItem('compliance_status', JSON.stringify(mockCompliance))
      
      console.log('🔧 Mocked demo user data in localStorage')
    })
    
    // Go directly to the main app
    await page.goto('http://localhost:3000/discover')
    console.log('📍 Navigated to /discover')
    
    // Check if bottom navigation appears
    const bottomNav = page.locator('[data-testid="bottom-navigation"]')
    await expect(bottomNav).toBeVisible({ timeout: 10000 })
    console.log('✅ Bottom navigation found!')
    
    // Check if we're on discover page (use the header, not the tab)
    await expect(page.locator('h1:has-text("Discover")')).toBeVisible()
    console.log('✅ Discover page loaded')
    
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
    await expect(page.locator('h1:has-text("Clubs")')).toBeVisible()
    console.log('✅ Clubs page loaded')
    
    // Test navigation back to Discover
    await page.locator('[data-testid="bottom-navigation"] >> text=Discover').click()
    await expect(page.locator('h1:has-text("Discover")')).toBeVisible()
    console.log('✅ Navigation back to Discover works')
    
    console.log('🎉 All frontend navigation tests passed!')
  })
}) 