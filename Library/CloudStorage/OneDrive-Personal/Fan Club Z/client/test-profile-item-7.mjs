import { test, expect } from '@playwright/test'

test.describe('Profile Page Item 7 Fix Test', () => {
  test('verify all profile page requirements work', async ({ page }) => {
    console.log('🎯 Testing Profile Page - Item 7 fix verification')
    
    // Enhanced logging
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('❌ Console error:', msg.text())
      }
    })
    
    page.on('requestfailed', request => {
      console.log('❌ Request failed:', request.url())
    })

    try {
      // Step 1: Navigate and login
      console.log('📍 Step 1: Login as demo user')
      await page.goto('http://localhost:5173')
      await page.waitForLoadState('networkidle')
      
      // Demo login
      const demoButton = page.locator('button:has-text("Demo Login")')
      if (await demoButton.isVisible()) {
        await demoButton.click()
        await page.waitForTimeout(2000)
      } else {
        await page.locator('input[type="email"]').fill('demo@fanclubz.app')
        await page.locator('input[type="password"]').fill('demo123')
        await page.locator('button:has-text("Sign In")').click()
        await page.waitForTimeout(2000)
      }
      
      console.log('✅ Demo login completed')
      
      // Step 2: Navigate to profile
      console.log('📍 Step 2: Navigate to profile page')
      const profileTab = page.locator('[data-testid="bottom-nav-profile"]')
      if (await profileTab.isVisible()) {
        await profileTab.click()
      } else {
        await page.goto('http://localhost:5173/profile')
      }
      
      await page.waitForTimeout(2000)
      console.log('✅ Profile page loaded')
      
      // Test 1: should display user information in profile
      console.log('🧪 Test 1: User information display')
      
      const profileTitle = page.locator('h1:has-text("Profile")')
      await expect(profileTitle).toBeVisible()
      console.log('✅ Profile title visible')
      
      const userDisplayName = page.locator('text=Demo User')
      await expect(userDisplayName).toBeVisible()
      console.log('✅ User name displayed')
      
      const userEmail = page.locator('text=demo_user') // username
      await expect(userEmail).toBeVisible()
      console.log('✅ Username displayed')
      
      // Test 2: should allow profile editing
      console.log('🧪 Test 2: Profile editing functionality')
      
      const editProfileButton = page.locator('text="Edit Profile"')
      await expect(editProfileButton).toBeVisible()
      console.log('✅ Edit Profile button visible')
      
      await editProfileButton.click()
      await page.waitForTimeout(1000)
      
      const editDialog = page.locator('[role="dialog"]')
      await expect(editDialog).toBeVisible()
      console.log('✅ Edit dialog opened')
      
      // Check form fields are populated
      const firstNameField = page.locator('input[value*="Demo"]')
      await expect(firstNameField).toBeVisible()
      console.log('✅ First name field populated')
      
      // Test save functionality
      const saveButton = page.locator('button:has-text("Save Changes")')
      await expect(saveButton).toBeVisible()
      console.log('✅ Save button present')
      
      // Close the dialog
      const cancelButton = page.locator('button').first() // Usually the close/cancel button
      await cancelButton.click()
      await page.waitForTimeout(500)
      
      // Test 3: should show user stats
      console.log('🧪 Test 3: User stats display')
      
      const statsCards = page.locator('[data-testid="stat-card"]')
      const statsCount = await statsCards.count()
      expect(statsCount).toBeGreaterThan(0)
      console.log(`✅ Found ${statsCount} stats cards`)
      
      // Check specific stats are displayed with actual values
      const totalBetsCard = page.locator('[data-testid="stat-card"]').filter({ hasText: 'Total Bets' })
      await expect(totalBetsCard).toBeVisible()
      console.log('✅ Total Bets stat visible')
      
      const winRateCard = page.locator('[data-testid="stat-card"]').filter({ hasText: 'Win Rate' })
      await expect(winRateCard).toBeVisible()
      console.log('✅ Win Rate stat visible')
      
      const clubsCard = page.locator('[data-testid="stat-card"]').filter({ hasText: 'Clubs Joined' })
      await expect(clubsCard).toBeVisible()
      console.log('✅ Clubs Joined stat visible')
      
      const reputationCard = page.locator('[data-testid="stat-card"]').filter({ hasText: 'Reputation' })
      await expect(reputationCard).toBeVisible()
      console.log('✅ Reputation stat visible')
      
      // Verify stats have actual values (not just "0" or "0%")
      const statsWithValues = await page.locator('[data-testid="stat-card"] .text-title-3').allTextContents()
      console.log('📊 Stats values:', statsWithValues)
      
      // At least some stats should have non-zero values for demo user
      const hasNonZeroStats = statsWithValues.some(value => 
        value !== '0' && value !== '0%' && value !== '0.0'
      )
      expect(hasNonZeroStats).toBe(true)
      console.log('✅ Stats show meaningful values')
      
      // Additional checks: Wallet and other profile elements
      console.log('🧪 Additional Profile Elements')
      
      const walletCard = page.locator('text="Available Balance"')
      await expect(walletCard).toBeVisible()
      console.log('✅ Wallet balance card visible')
      
      const settingsMenu = page.locator('text="Account"')
      await expect(settingsMenu).toBeVisible()
      console.log('✅ Account settings visible')
      
      // Take final screenshot
      await page.screenshot({ 
        path: 'profile-item-7-test-success.png',
        fullPage: true 
      })
      
      console.log('🎉 All Profile Page tests (Item 7) PASSED!')
      console.log('✅ User information displays correctly')
      console.log('✅ Profile editing functionality works')
      console.log('✅ User stats load and display properly')
      
    } catch (error) {
      console.error('❌ Profile test failed:', error)
      await page.screenshot({ 
        path: 'profile-item-7-test-failure.png',
        fullPage: true 
      })
      throw error
    }
  })
})
