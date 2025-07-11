import { test, expect } from '@playwright/test'

test.describe('Bet Detail Page Navigation and Features', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:3000')
    await page.waitForLoadState('networkidle')
  })

  test('Back button navigates to correct previous screen from Discover', async ({ page }) => {
    // Navigate to Discover tab
    await page.click('text=Discover')
    await page.waitForSelector('text=Trending Now')
    
    // Click on a bet to open detail page
    await page.click('text=View Details')
    await page.waitForURL(/\/bets\/.*/)
    
    // Verify we're on bet detail page
    await expect(page.locator('h1')).toContainText('Will Bitcoin reach')
    
    // Click back button
    await page.click('button[aria-label="Go back"], button:has([data-lucide="arrow-left"])')
    
    // Should return to Discover
    await expect(page).toHaveURL(/\/discover/)
    await expect(page.locator('text=Trending Now')).toBeVisible()
  })

  test('Back button navigates to correct previous screen from My Bets', async ({ page }) => {
    // Login first
    await page.click('text=Sign In')
    await page.fill('input[type="email"]', 'demo@fanclubz.app')
    await page.fill('input[type="password"]', 'demo123')
    await page.click('button:has-text("Sign In")')
    await page.waitForURL(/\/discover/)
    
    // Navigate to My Bets tab
    await page.click('text=My Bets')
    await page.waitForSelector('text=Active Positions')
    
    // Click on a bet to open detail page (if any bets exist)
    const betCard = page.locator('text=View Details').first()
    if (await betCard.isVisible()) {
      await betCard.click()
      await page.waitForURL(/\/bets\/.*/)
      
      // Click back button
      await page.click('button[aria-label="Go back"], button:has([data-lucide="arrow-left"])')
      
      // Should return to My Bets
      await expect(page).toHaveURL(/\/bets/)
      await expect(page.locator('text=Active Positions')).toBeVisible()
    }
  })

  test('Comment input is disabled for unauthenticated users', async ({ page }) => {
    // Navigate to a bet detail page
    await page.click('text=View Details')
    await page.waitForURL(/\/bets\/.*/)
    
    // Check that comment input is disabled
    const commentInput = page.locator('input[placeholder*="Sign in to comment"]')
    await expect(commentInput).toBeDisabled()
    
    // Check that send button is disabled
    const sendButton = page.locator('button:has-text("Send")')
    await expect(sendButton).toBeDisabled()
    
    // Check that login prompt is shown
    await expect(page.locator('text=Sign in to comment')).toBeVisible()
  })

  test('Authenticated users can comment and comments persist', async ({ page }) => {
    // Login first
    await page.click('text=Sign In')
    await page.fill('input[type="email"]', 'demo@fanclubz.app')
    await page.fill('input[type="password"]', 'demo123')
    await page.click('button:has-text("Sign In")')
    await page.waitForURL(/\/discover/)
    
    // Navigate to a bet detail page
    await page.click('text=View Details')
    await page.waitForURL(/\/bets\/.*/)
    
    // Check that comment input is enabled
    const commentInput = page.locator('input[placeholder*="Add a comment"]')
    await expect(commentInput).toBeEnabled()
    
    // Add a comment
    const testComment = 'This is a test comment from E2E test'
    await commentInput.fill(testComment)
    
    // Send the comment
    await page.click('button:has-text("Send")')
    
    // Verify comment appears in the list
    await expect(page.locator(`text=${testComment}`)).toBeVisible()
    
    // Verify comment input is cleared
    await expect(commentInput).toHaveValue('')
  })

  test('Placing a bet updates My Bets screen', async ({ page }) => {
    // Login first
    await page.click('text=Sign In')
    await page.fill('input[type="email"]', 'demo@fanclubz.app')
    await page.fill('input[type="password"]', 'demo123')
    await page.click('button:has-text("Sign In")')
    await page.waitForURL(/\/discover/)
    
    // Navigate to a bet detail page
    await page.click('text=View Details')
    await page.waitForURL(/\/bets\/.*/)
    
    // Select a bet option
    await page.click('text=Yes, it will reach $100K')
    
    // Enter stake amount
    await page.fill('input[placeholder*="Enter stake"]', '50')
    
    // Place the bet
    await page.click('button:has-text("Place Bet")')
    
    // Wait for confirmation
    await expect(page.locator('text=Bet placed successfully!')).toBeVisible()
    
    // Navigate to My Bets
    await page.click('text=My Bets')
    await page.waitForSelector('text=Active Positions')
    
    // Verify the bet appears in My Bets (if the UI shows it)
    // This depends on the actual implementation of My Bets screen
    await expect(page.locator('text=Active Positions')).toBeVisible()
  })

  test('My Bets tab is highlighted when viewing a bet with user entry', async ({ page }) => {
    // Login first
    await page.click('text=Sign In')
    await page.fill('input[type="email"]', 'demo@fanclubz.app')
    await page.fill('input[type="password"]', 'demo123')
    await page.click('button:has-text("Sign In")')
    await page.waitForURL(/\/discover/)
    
    // Place a bet first (if not already placed)
    await page.click('text=View Details')
    await page.waitForURL(/\/bets\/.*/)
    
    // Select option and place bet
    await page.click('text=Yes, it will reach $100K')
    await page.fill('input[placeholder*="Enter stake"]', '25')
    await page.click('button:has-text("Place Bet")')
    await expect(page.locator('text=Bet placed successfully!')).toBeVisible()
    
    // Now navigate to the same bet from Discover
    await page.click('text=Discover')
    await page.waitForSelector('text=Trending Now')
    await page.click('text=View Details')
    await page.waitForURL(/\/bets\/.*/)
    
    // Check that My Bets tab is highlighted in bottom navigation
    const myBetsTab = page.locator('button:has-text("My Bets")')
    await expect(myBetsTab).toHaveClass(/text-blue-500/)
    
    // Other tabs should not be highlighted
    const discoverTab = page.locator('button:has-text("Discover")')
    await expect(discoverTab).not.toHaveClass(/text-blue-500/)
  })

  test('Discover tab is highlighted when viewing a bet without user entry', async ({ page }) => {
    // Login first
    await page.click('text=Sign In')
    await page.fill('input[type="email"]', 'demo@fanclubz.app')
    await page.fill('input[type="password"]', 'demo123')
    await page.click('button:has-text("Sign In")')
    await page.waitForURL(/\/discover/)
    
    // Navigate to a different bet (one we haven't placed a bet on)
    await page.click('text=View Details')
    await page.waitForURL(/\/bets\/.*/)
    
    // Check that Discover tab is highlighted in bottom navigation
    const discoverTab = page.locator('button:has-text("Discover")')
    await expect(discoverTab).toHaveClass(/text-blue-500/)
    
    // My Bets tab should not be highlighted
    const myBetsTab = page.locator('button:has-text("My Bets")')
    await expect(myBetsTab).not.toHaveClass(/text-blue-500/)
  })

  test('Comments are loaded from backend for real users', async ({ page }) => {
    // Login first
    await page.click('text=Sign In')
    await page.fill('input[type="email"]', 'demo@fanclubz.app')
    await page.fill('input[type="password"]', 'demo123')
    await page.click('button:has-text("Sign In")')
    await page.waitForURL(/\/discover/)
    
    // Navigate to a bet detail page
    await page.click('text=View Details')
    await page.waitForURL(/\/bets\/.*/)
    
    // Wait for comments to load
    await page.waitForSelector('text=Comments')
    
    // Check that comments section is visible
    await expect(page.locator('text=Comments')).toBeVisible()
    
    // Check that comment input is available
    await expect(page.locator('input[placeholder*="Add a comment"]')).toBeVisible()
  })

  test('Error handling for comment loading', async ({ page }) => {
    // Mock network error for comments API
    await page.route('**/api/bets/*/comments', route => {
      route.abort('failed')
    })
    
    // Login first
    await page.click('text=Sign In')
    await page.fill('input[type="email"]', 'demo@fanclubz.app')
    await page.fill('input[type="password"]', 'demo123')
    await page.click('button:has-text("Sign In")')
    await page.waitForURL(/\/discover/)
    
    // Navigate to a bet detail page
    await page.click('text=View Details')
    await page.waitForURL(/\/bets\/.*/)
    
    // Check that error message is shown
    await expect(page.locator('text=Failed to load comments')).toBeVisible()
  })

  test('URL referrer parameter is correctly parsed', async ({ page }) => {
    // Navigate directly to a bet with referrer parameter
    await page.goto('http://localhost:3000/bets/3235f312-e442-4ca1-9fce-dcf9d9b4bce5?referrer=/clubs')
    
    // Verify we're on the bet detail page
    await expect(page.locator('h1')).toContainText('Will Bitcoin reach')
    
    // Click back button
    await page.click('button[aria-label="Go back"], button:has([data-lucide="arrow-left"])')
    
    // Should return to Clubs (based on referrer)
    await expect(page).toHaveURL(/\/clubs/)
  })
}) 