import { test, expect } from '@playwright/test'

test.describe('Profile Page Issues - Comprehensive Debug', () => {
  test('debug profile page loading and functionality', async ({ page }) => {
    // Enable console and network logging
    const consoleMessages: string[] = []
    const networkRequests: Array<{ url: string, status: number, method: string }> = []
    const errors: string[] = []

    page.on('console', msg => {
      const text = msg.text()
      consoleMessages.push(text)
      if (msg.type() === 'error') {
        console.log('❌ Console error:', text)
        errors.push(text)
      } else if (text.includes('Profile') || text.includes('Stats') || text.includes('User')) {
        console.log('📝 Profile related:', text)
      }
    })
    
    page.on('response', response => {
      const request = response.request()
      networkRequests.push({
        url: request.url(),
        status: response.status(),
        method: request.method()
      })
      
      if (request.url().includes('/api/')) {
        console.log(`🌐 API ${request.method()} ${request.url()} → ${response.status()}`)
      }
    })

    try {
      console.log('🚀 Starting comprehensive profile debug test...')
      
      // Step 1: Navigate to homepage
      console.log('📍 Step 1: Navigating to homepage...')
      await page.goto('http://localhost:5173')
      await page.waitForLoadState('networkidle')
      
      // Step 2: Perform demo login
      console.log('📍 Step 2: Performing demo login...')
      const demoButton = page.locator('button:has-text("Demo Login")')
      if (await demoButton.isVisible()) {
        console.log('✅ Demo button found, clicking...')
        await demoButton.click()
        await page.waitForTimeout(3000)
      } else {
        console.log('❌ Demo button not found, trying manual login...')
        const emailInput = page.locator('input[type="email"]')
        if (await emailInput.isVisible()) {
          await emailInput.fill('demo@fanclubz.app')
          await page.locator('input[type="password"]').fill('demo123')
          await page.locator('button:has-text("Sign In")').click()
          await page.waitForTimeout(3000)
        }
      }
      
      // Check if login was successful
      const currentUrl = page.url()
      console.log('🔗 Current URL after login:', currentUrl)
      
      // Step 3: Navigate to profile page
      console.log('📍 Step 3: Navigating to profile page...')
      const profileTab = page.locator('[data-testid="bottom-nav-profile"]')
      if (await profileTab.isVisible()) {
        console.log('✅ Profile tab found, clicking...')
        await profileTab.click()
      } else {
        console.log('❌ Profile tab not found, trying alternative navigation...')
        await page.goto('http://localhost:5173/profile')
      }
      
      await page.waitForTimeout(2000)
      
      // Step 4: Check profile page components
      console.log('📍 Step 4: Checking profile page components...')
      
      // Check page title
      const profileTitle = page.locator('h1:has-text("Profile")')
      const titleVisible = await profileTitle.isVisible()
      console.log('📄 Profile title visible:', titleVisible)
      
      // Check user information display
      const userNameElements = await page.locator('text=Demo User').count()
      console.log('👤 User name elements found:', userNameElements)
      
      // Check stats cards
      const statsCards = page.locator('[data-testid="stat-card"]')
      const statsCount = await statsCards.count()
      console.log('📊 Stats cards count:', statsCount)
      
      if (statsCount > 0) {
        console.log('✅ Stats cards are present')
        for (let i = 0; i < statsCount; i++) {
          const card = statsCards.nth(i)
          const cardText = await card.textContent()
          console.log(`📊 Stats card ${i + 1}:`, cardText?.trim())
        }
      } else {
        console.log('❌ No stats cards found')
      }
      
      // Check wallet balance
      const walletCard = page.locator('text="Available Balance"')
      const walletVisible = await walletCard.isVisible()
      console.log('💰 Wallet card visible:', walletVisible)
      
      if (walletVisible) {
        const balanceText = await page.locator('.text-title-1').textContent()
        console.log('💰 Balance text:', balanceText)
      }
      
      // Check settings menu
      const editProfileButton = page.locator('text="Edit Profile"')
      const editVisible = await editProfileButton.isVisible()
      console.log('⚙️ Edit Profile button visible:', editVisible)
      
      // Step 5: Test profile editing functionality
      if (editVisible) {
        console.log('📍 Step 5: Testing profile editing...')
        await editProfileButton.click()
        await page.waitForTimeout(1000)
        
        const editDialog = page.locator('[role="dialog"]')
        const dialogVisible = await editDialog.isVisible()
        console.log('📝 Edit dialog opened:', dialogVisible)
        
        if (dialogVisible) {
          // Check form fields
          const firstNameField = page.locator('input[value*="Demo"]')
          const fieldVisible = await firstNameField.isVisible()
          console.log('📝 First name field visible:', fieldVisible)
          
          // Try to save (should work)
          const saveButton = page.locator('button:has-text("Save Changes")')
          if (await saveButton.isVisible()) {
            console.log('💾 Save button found, testing...')
            await saveButton.click()
            await page.waitForTimeout(2000)
          }
        }
      }
      
      // Step 6: Check API requests
      console.log('📍 Step 6: Analyzing API requests...')
      const profileRequests = networkRequests.filter(req => 
        req.url.includes('/api/stats/') || 
        req.url.includes('/api/users/') ||
        req.url.includes('/api/wallet/')
      )
      
      console.log('🌐 Profile-related API requests:')
      profileRequests.forEach(req => {
        console.log(`   ${req.method} ${req.url} → ${req.status}`)
      })
      
      // Step 7: Check for specific errors
      console.log('📍 Step 7: Error analysis...')
      const profileErrors = errors.filter(error => 
        error.toLowerCase().includes('profile') ||
        error.toLowerCase().includes('stats') ||
        error.toLowerCase().includes('user') ||
        error.toLowerCase().includes('404') ||
        error.toLowerCase().includes('401')
      )
      
      if (profileErrors.length > 0) {
        console.log('❌ Profile-related errors found:')
        profileErrors.forEach(error => console.log(`   ${error}`))
      } else {
        console.log('✅ No profile-related errors found')
      }
      
      // Step 8: Take screenshot for analysis
      await page.screenshot({ 
        path: 'profile-comprehensive-debug.png',
        fullPage: true 
      })
      console.log('📸 Screenshot saved as profile-comprehensive-debug.png')
      
      // Final assessment
      console.log('📍 Final Assessment:')
      console.log(`   - Profile page accessible: ${titleVisible}`)
      console.log(`   - User info displayed: ${userNameElements > 0}`)
      console.log(`   - Stats loaded: ${statsCount > 0}`)
      console.log(`   - Wallet displayed: ${walletVisible}`)
      console.log(`   - Edit functionality: ${editVisible}`)
      console.log(`   - API requests made: ${profileRequests.length}`)
      console.log(`   - Errors encountered: ${profileErrors.length}`)
      
      // Tests that should pass
      expect(titleVisible, 'Profile title should be visible').toBe(true)
      expect(userNameElements, 'User name should be displayed').toBeGreaterThan(0)
      expect(statsCount, 'Stats cards should be present').toBeGreaterThan(0)
      expect(walletVisible, 'Wallet card should be visible').toBe(true)
      expect(editVisible, 'Edit Profile button should be visible').toBe(true)
      
      console.log('✅ All profile tests passed!')
      
    } catch (error) {
      console.error('❌ Test execution error:', error)
      await page.screenshot({ 
        path: 'profile-debug-error.png',
        fullPage: true 
      })
      throw error
    }
  })
  
  test('check specific profile API endpoints', async ({ page }) => {
    console.log('🔍 Testing specific profile API endpoints...')
    
    // Navigate and login first
    await page.goto('http://localhost:5173')
    await page.waitForLoadState('networkidle')
    
    // Demo login
    const demoButton = page.locator('button:has-text("Demo Login")')
    if (await demoButton.isVisible()) {
      await demoButton.click()
      await page.waitForTimeout(2000)
    }
    
    // Test API endpoints directly
    const apiTests = [
      { endpoint: '/api/stats/user/demo-user-id', description: 'User stats' },
      { endpoint: '/api/wallet/balance/demo-user-id', description: 'Wallet balance' },
      { endpoint: '/api/users/me', description: 'User profile' }
    ]
    
    for (const test of apiTests) {
      try {
        console.log(`🧪 Testing ${test.description}: ${test.endpoint}`)
        
        const response = await page.evaluate(async (endpoint) => {
          const token = localStorage.getItem('accessToken') || localStorage.getItem('auth_token')
          const response = await fetch(`http://localhost:5001/api${endpoint}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          })
          return {
            status: response.status,
            data: await response.text()
          }
        }, test.endpoint)
        
        console.log(`   Response: ${response.status}`)
        if (response.status !== 200) {
          console.log(`   Error: ${response.data}`)
        } else {
          console.log(`   ✅ ${test.description} API working`)
        }
      } catch (error) {
        console.log(`   ❌ ${test.description} API failed:`, error)
      }
    }
  })
})
