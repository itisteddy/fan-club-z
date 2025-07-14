import { test, expect } from '@playwright/test'

test.describe('Profile Page Debug', () => {
  test('investigate profile page issues', async ({ page }) => {
    // Listen for console logs and errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('❌ Console error:', msg.text())
      }
    })
    
    page.on('requestfailed', request => {
      console.log('❌ Request failed:', request.url(), request.failure()?.errorText)
    })

    try {
      console.log('🚀 Starting profile page debug...')
      
      // Navigate to homepage
      await page.goto('http://localhost:5173')
      await page.waitForLoadState('networkidle')
      
      console.log('📍 On homepage, attempting demo login...')
      
      // Try to find and click demo login
      const demoButton = page.locator('button:has-text("Demo Login")')
      if (await demoButton.isVisible()) {
        console.log('✅ Demo button found, clicking...')
        await demoButton.click()
        await page.waitForTimeout(2000)
      } else {
        console.log('❌ Demo button not found, checking for login form...')
        const emailInput = page.locator('input[type="email"]')
        if (await emailInput.isVisible()) {
          console.log('📧 Login form found, filling demo credentials...')
          await emailInput.fill('demo@fanclubz.app')
          await page.locator('input[type="password"]').fill('demo123')
          await page.locator('button:has-text("Sign In")').click()
          await page.waitForTimeout(2000)
        }
      }
      
      console.log('📍 Attempting to navigate to profile...')
      
      // Navigate to profile
      const profileTab = page.locator('[data-testid="bottom-nav-profile"]')
      if (await profileTab.isVisible()) {
        console.log('✅ Profile tab found, clicking...')
        await profileTab.click()
        await page.waitForTimeout(1000)
      } else {
        console.log('❌ Profile tab not found, trying alternative selector...')
        const profileLink = page.locator('text=Profile')
        if (await profileLink.isVisible()) {
          await profileLink.click()
          await page.waitForTimeout(1000)
        } else {
          console.log('❌ No profile navigation found, going direct URL...')
          await page.goto('http://localhost:5173/profile')
          await page.waitForTimeout(1000)
        }
      }
      
      console.log('📍 On profile page, checking content...')
      
      // Check if we're on profile page
      const currentUrl = page.url()
      console.log('🔗 Current URL:', currentUrl)
      
      // Check for profile header
      const profileHeader = page.locator('h1:has-text("Profile")')
      const headerExists = await profileHeader.isVisible()
      console.log('📝 Profile header exists:', headerExists)
      
      // Check for user information
      const userName = page.locator('text=Demo User')
      const userNameExists = await userName.isVisible()
      console.log('👤 User name visible:', userNameExists)
      
      // Check for stats
      const statsCards = page.locator('[data-testid="stat-card"]')
      const statsCount = await statsCards.count()
      console.log('📊 Stats cards count:', statsCount)
      
      // Check for wallet card
      const walletCard = page.locator('text="Available Balance"')
      const walletExists = await walletCard.isVisible()
      console.log('💰 Wallet card visible:', walletExists)
      
      // Check for settings
      const editProfile = page.locator('text="Edit Profile"')
      const editExists = await editProfile.isVisible()
      console.log('⚙️ Edit Profile button visible:', editExists)
      
      // Try clicking edit profile to test functionality
      if (editExists) {
        console.log('🖱️ Attempting to click Edit Profile...')
        await editProfile.click()
        await page.waitForTimeout(500)
        
        const editDialog = page.locator('[role="dialog"]')
        const dialogVisible = await editDialog.isVisible()
        console.log('📝 Edit dialog opened:', dialogVisible)
        
        if (dialogVisible) {
          // Close the dialog
          const closeButton = page.locator('[role="dialog"] button').first()
          if (await closeButton.isVisible()) {
            await closeButton.click()
          }
        }
      }
      
      // Check for API requests
      await page.waitForTimeout(1000)
      
      // Check for any error messages
      const errorMessages = await page.locator('.error, [data-testid="error"]').allTextContents()
      if (errorMessages.length > 0) {
        console.log('❌ Error messages found:', errorMessages)
      } else {
        console.log('✅ No error messages found')
      }
      
      // Take screenshot for analysis
      await page.screenshot({ 
        path: 'profile-debug-screenshot.png',
        fullPage: true 
      })
      console.log('📸 Screenshot saved as profile-debug-screenshot.png')
      
      console.log('🎯 Profile debug completed')
      
    } catch (error) {
      console.error('❌ Test error:', error)
      await page.screenshot({ 
        path: 'profile-error-screenshot.png',
        fullPage: true 
      })
    }
  })
})
