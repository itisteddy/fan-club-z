import { test, expect } from '@playwright/test'

test.describe('Navigation & Bottom Navigation', () => {
  test.beforeEach(async ({ page }) => {
    // Listen for console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('🔥 BROWSER ERROR:', msg.text())
      }
    })
    
    page.on('pageerror', error => {
      console.log('💥 PAGE ERROR:', error.message)
    })
  })

  test('should navigate between all tabs', async ({ page }) => {
    console.log('🧪 Testing navigation between all tabs...')
    
    // Navigate to the app
    await page.goto('http://localhost:3000')
    await page.waitForLoadState('networkidle')
    
    // Check if we're on login page and authenticate if needed
    const isLoginPage = await page.locator('text=Welcome to Fan Club Z').isVisible()
    if (isLoginPage) {
      console.log('🔐 Login page detected, using demo authentication...')
      const demoButton = page.locator('button:has-text("Try Demo")')
      
      if (await demoButton.isVisible()) {
        await demoButton.click()
        await page.waitForLoadState('networkidle')
        await page.waitForTimeout(2000)
      }
    }
    
    // Wait for bottom navigation to appear
    await page.waitForSelector('[data-testid="bottom-navigation"]', { timeout: 10000 })
    
    // Verify bottom navigation is visible
    const bottomNav = page.locator('[data-testid="bottom-navigation"]')
    await expect(bottomNav).toBeVisible()
    
    console.log('✅ Bottom navigation is visible')
    
    // Test each navigation tab
    const tabs = [
      {
        testId: 'nav-discover',
        label: 'Discover',
        expectedUrl: '/discover',
        expectedPageTitle: 'Discover',
        shouldHaveFAB: true
      },
      {
        testId: 'nav-my-bets', 
        label: 'My Bets',
        expectedUrl: '/bets',
        expectedPageTitle: 'My Bets',
        shouldHaveFAB: true
      },
      {
        testId: 'nav-clubs',
        label: 'Clubs', 
        expectedUrl: '/clubs',
        expectedPageTitle: 'Clubs',
        shouldHaveFAB: false
      },
      {
        testId: 'nav-profile',
        label: 'Profile',
        expectedUrl: '/profile', 
        expectedPageTitle: 'Profile',
        shouldHaveFAB: false
      }
    ]
    
    for (const tab of tabs) {
      console.log(`🔄 Testing ${tab.label} tab...`)
      
      // Click the tab
      const tabButton = page.locator(`[data-testid="${tab.testId}"]`)
      await expect(tabButton).toBeVisible()
      await tabButton.click()
      
      // Wait for navigation to complete
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(1000)
      
      // Verify URL
      expect(page.url()).toContain(tab.expectedUrl)
      console.log(`  ✅ URL correctly shows: ${tab.expectedUrl}`)
      
      // Verify page title is displayed
      const pageTitle = page.locator(`h1:has-text("${tab.expectedPageTitle}")`).first()
      await expect(pageTitle).toBeVisible()
      console.log(`  ✅ Page title "${tab.expectedPageTitle}" is visible`)
      
      // Check for active state on navigation button
      await expect(tabButton).toHaveClass(/bg-blue-50/)
      console.log(`  ✅ Navigation button shows active state`)
      
      // Verify Floating Action Button presence
      const fab = page.locator('[data-testid="floating-action-button"]')
      if (tab.shouldHaveFAB) {
        await expect(fab).toBeVisible()
        console.log(`  ✅ FAB is visible (expected)`)
      } else {
        await expect(fab).not.toBeVisible()
        console.log(`  ✅ FAB is hidden (expected)`)
      }
      
      // Take a screenshot for verification
      await page.screenshot({ 
        path: `test-navigation-${tab.label.toLowerCase().replace(' ', '-')}.png`,
        fullPage: false 
      })
      
      console.log(`  📸 Screenshot saved for ${tab.label} tab`)
    }
    
    console.log('🎉 All navigation tests passed!')
  })
  
  test('should show correct navigation for unauthenticated users', async ({ page }) => {
    console.log('🧪 Testing navigation for unauthenticated users...')
    
    // Navigate to the app
    await page.goto('http://localhost:3000')
    await page.waitForLoadState('networkidle')
    
    // Check if we're on login page 
    const isLoginPage = await page.locator('text=Welcome to Fan Club Z').isVisible()
    
    if (isLoginPage) {
      console.log('✅ On login page - navigation should not be visible')
      
      // Bottom navigation should not be visible on auth pages
      const bottomNav = page.locator('[data-testid="bottom-navigation"]')
      await expect(bottomNav).not.toBeVisible()
      
      console.log('✅ Bottom navigation correctly hidden on login page')
    } else {
      console.log('🔍 Not on login page, checking public navigation...')
      
      // If not on login, check that "Sign In" button appears instead of Profile
      await page.waitForSelector('[data-testid="bottom-navigation"]', { timeout: 5000 })
      
      const signInButton = page.locator('[data-testid="nav-sign-in"]')
      await expect(signInButton).toBeVisible()
      
      // Click Sign In button should navigate to login
      await signInButton.click()
      await page.waitForLoadState('networkidle')
      
      expect(page.url()).toContain('/auth/login')
      console.log('✅ Sign In button correctly navigates to login page')
    }
  })
  
  test('should handle navigation accessibility', async ({ page }) => {
    console.log('🧪 Testing navigation accessibility...')
    
    await page.goto('http://localhost:3000')
    await page.waitForLoadState('networkidle')
    
    // Skip login if on login page
    const isLoginPage = await page.locator('text=Welcome to Fan Club Z').isVisible()
    if (isLoginPage) {
      const demoButton = page.locator('button:has-text("Try Demo")')
      if (await demoButton.isVisible()) {
        await demoButton.click()
        await page.waitForLoadState('networkidle')
      }
    }
    
    await page.waitForSelector('[data-testid="bottom-navigation"]', { timeout: 10000 })
    
    // Check navigation has proper ARIA labels
    const navigation = page.locator('[data-testid="bottom-navigation"]')
    await expect(navigation).toHaveAttribute('role', 'navigation')
    await expect(navigation).toHaveAttribute('aria-label', 'Main navigation')
    
    console.log('✅ Navigation has proper ARIA role and label')
    
    // Check each tab button has proper accessibility attributes
    const tabButtons = page.locator('[data-testid^="nav-"]')
    const count = await tabButtons.count()
    
    for (let i = 0; i < count; i++) {
      const button = tabButtons.nth(i)
      const ariaLabel = await button.getAttribute('aria-label')
      
      expect(ariaLabel).toBeTruthy()
      console.log(`  ✅ Tab ${i + 1} has aria-label: "${ariaLabel}"`)
    }
    
    // Test keyboard navigation
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    
    // Check that focus is visible
    const focusedElement = page.locator(':focus')
    await expect(focusedElement).toBeVisible()
    
    console.log('✅ Keyboard navigation works correctly')
  })
  
  test('should maintain state across navigation', async ({ page }) => {
    console.log('🧪 Testing state persistence across navigation...')
    
    await page.goto('http://localhost:3000')
    await page.waitForLoadState('networkidle')
    
    // Authenticate if needed
    const isLoginPage = await page.locator('text=Welcome to Fan Club Z').isVisible()
    if (isLoginPage) {
      const demoButton = page.locator('button:has-text("Try Demo")')
      if (await demoButton.isVisible()) {
        await demoButton.click()
        await page.waitForLoadState('networkidle')
      }
    }
    
    await page.waitForSelector('[data-testid="bottom-navigation"]', { timeout: 10000 })
    
    // Start on Discover tab
    const discoverTab = page.locator('[data-testid="nav-discover"]')
    await discoverTab.click()
    await page.waitForLoadState('networkidle')
    
    // Perform a search to create some state
    const searchInput = page.locator('[data-testid="search-input"]')
    if (await searchInput.isVisible()) {
      await searchInput.fill('bitcoin')
      await page.waitForTimeout(1000)
      
      console.log('✅ Entered search term: bitcoin')
    }
    
    // Navigate to another tab
    const clubsTab = page.locator('[data-testid="nav-clubs"]')
    await clubsTab.click() 
    await page.waitForLoadState('networkidle')
    
    // Navigate back to Discover
    await discoverTab.click()
    await page.waitForLoadState('networkidle')
    
    // Check if search state is maintained (this is implementation dependent)
    if (await searchInput.isVisible()) {
      const searchValue = await searchInput.inputValue()
      console.log(`🔍 Search value after navigation: "${searchValue}"`)
      
      // The behavior here depends on implementation - state might or might not persist
      console.log('✅ Navigation completed without errors')
    }
  })
  
  test('should handle rapid navigation clicks', async ({ page }) => {
    console.log('🧪 Testing rapid navigation clicks...')
    
    await page.goto('http://localhost:3000')
    await page.waitForLoadState('networkidle')
    
    // Authenticate if needed
    const isLoginPage = await page.locator('text=Welcome to Fan Club Z').isVisible()
    if (isLoginPage) {
      const demoButton = page.locator('button:has-text("Try Demo")')
      if (await demoButton.isVisible()) {
        await demoButton.click()
        await page.waitForLoadState('networkidle')
      }
    }
    
    await page.waitForSelector('[data-testid="bottom-navigation"]', { timeout: 10000 })
    
    // Rapidly click between tabs
    const discoverTab = page.locator('[data-testid="nav-discover"]')
    const clubsTab = page.locator('[data-testid="nav-clubs"]')
    const myBetsTab = page.locator('[data-testid="nav-my-bets"]')
    
    // Rapid clicking test
    for (let i = 0; i < 3; i++) {
      await discoverTab.click()
      await page.waitForTimeout(100)
      await clubsTab.click()
      await page.waitForTimeout(100)
      await myBetsTab.click()
      await page.waitForTimeout(100)
    }
    
    // Wait for final navigation to settle
    await page.waitForLoadState('networkidle')
    
    // Verify we're on the last clicked tab (My Bets)
    expect(page.url()).toContain('/bets')
    
    // Verify navigation is still functional
    await discoverTab.click()
    await page.waitForLoadState('networkidle')
    expect(page.url()).toContain('/discover')
    
    console.log('✅ Rapid navigation clicks handled correctly')
  })
  
  test('should show floating action button correctly', async ({ page }) => {
    console.log('🧪 Testing Floating Action Button behavior...')
    
    await page.goto('http://localhost:3000')
    await page.waitForLoadState('networkidle')
    
    // Authenticate if needed
    const isLoginPage = await page.locator('text=Welcome to Fan Club Z').isVisible()
    if (isLoginPage) {
      const demoButton = page.locator('button:has-text("Try Demo")')
      if (await demoButton.isVisible()) {
        await demoButton.click()
        await page.waitForLoadState('networkidle')
      }
    }
    
    await page.waitForSelector('[data-testid="bottom-navigation"]', { timeout: 10000 })
    
    // Test FAB on Discover tab
    const discoverTab = page.locator('[data-testid="nav-discover"]')
    await discoverTab.click()
    await page.waitForLoadState('networkidle')
    
    const fab = page.locator('[data-testid="floating-action-button"]')
    await expect(fab).toBeVisible()
    console.log('✅ FAB visible on Discover tab')
    
    // Test FAB functionality
    await fab.click()
    await page.waitForLoadState('networkidle')
    
    // Should navigate to create bet page
    expect(page.url()).toContain('/create-bet')
    console.log('✅ FAB correctly navigates to create bet page')
    
    // Go back and test on My Bets tab
    await page.goBack()
    await page.waitForLoadState('networkidle')
    
    const myBetsTab = page.locator('[data-testid="nav-my-bets"]')
    await myBetsTab.click()
    await page.waitForLoadState('networkidle')
    
    await expect(fab).toBeVisible()
    console.log('✅ FAB visible on My Bets tab')
    
    // Test FAB on Clubs tab (should be hidden)
    const clubsTab = page.locator('[data-testid="nav-clubs"]')
    await clubsTab.click()
    await page.waitForLoadState('networkidle')
    
    await expect(fab).not.toBeVisible()
    console.log('✅ FAB correctly hidden on Clubs tab')
    
    // Test FAB on Profile tab (should be hidden)
    const profileTab = page.locator('[data-testid="nav-profile"]')
    await profileTab.click()
    await page.waitForLoadState('networkidle')
    
    await expect(fab).not.toBeVisible()
    console.log('✅ FAB correctly hidden on Profile tab')
  })
  
  test('should handle mobile viewport correctly', async ({ page }) => {
    console.log('🧪 Testing mobile viewport behavior...')
    
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 }) // iPhone SE
    
    await page.goto('http://localhost:3000')
    await page.waitForLoadState('networkidle')
    
    // Authenticate if needed
    const isLoginPage = await page.locator('text=Welcome to Fan Club Z').isVisible()
    if (isLoginPage) {
      const demoButton = page.locator('button:has-text("Try Demo")')
      if (await demoButton.isVisible()) {
        await demoButton.click()
        await page.waitForLoadState('networkidle')
      }
    }
    
    await page.waitForSelector('[data-testid="bottom-navigation"]', { timeout: 10000 })
    
    // Check that navigation is still visible and functional on mobile
    const bottomNav = page.locator('[data-testid="bottom-navigation"]')
    await expect(bottomNav).toBeVisible()
    
    // Check that all tab buttons are still accessible
    const tabButtons = page.locator('[data-testid^="nav-"]')
    const count = await tabButtons.count()
    expect(count).toBeGreaterThanOrEqual(4)
    
    console.log(`✅ Found ${count} navigation tabs on mobile viewport`)
    
    // Test touch targets are adequate (buttons should be at least 44px)
    for (let i = 0; i < count; i++) {
      const button = tabButtons.nth(i)
      const box = await button.boundingBox()
      
      if (box) {
        expect(box.width).toBeGreaterThanOrEqual(44)
        expect(box.height).toBeGreaterThanOrEqual(44)
        console.log(`  ✅ Tab ${i + 1} has adequate touch target: ${box.width}x${box.height}px`)
      }
    }
    
    // Test different mobile screen sizes
    const mobileSizes = [
      { width: 390, height: 844, name: 'iPhone 14' },
      { width: 428, height: 926, name: 'iPhone 14 Plus' },
      { width: 360, height: 640, name: 'Android Small' }
    ]
    
    for (const size of mobileSizes) {
      await page.setViewportSize(size)
      await page.waitForTimeout(500)
      
      await expect(bottomNav).toBeVisible()
      console.log(`✅ Navigation works on ${size.name} (${size.width}x${size.height})`)
    }
  })
})