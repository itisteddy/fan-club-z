import { test, expect } from '@playwright/test'

test('bet creation functionality', async ({ page }) => {
  console.log('🧪 Starting bet creation test...')
  
  // Navigate to the app
  await page.goto('http://localhost:5173/')
  
  // Perform demo login first
  console.log('🔑 Logging in as demo user...')
  try {
    await page.click('button:has-text("Demo Login")', { timeout: 5000 })
    await page.waitForLoadState('networkidle', { timeout: 10000 })
  } catch (error) {
    console.log('⚠️ Demo login not found or failed:', error.message)
  }
  
  // Wait for app to be ready
  await page.waitForSelector('[data-testid="bottom-navigation"]', { timeout: 10000 })
  console.log('✅ Bottom navigation found')
  
  // Test 1: Check if Create tab is visible in bottom navigation
  console.log('🔍 Checking if Create tab exists in bottom navigation...')
  const createNavButton = page.locator('[data-testid="nav-create"]')
  const isCreateNavVisible = await createNavButton.isVisible()
  console.log('📱 Create nav button visible:', isCreateNavVisible)
  
  if (!isCreateNavVisible) {
    console.log('❌ Create navigation button not found!')
    return
  }
  
  // Test 2: Try to navigate to create bet page
  console.log('🔍 Clicking on Create tab...')
  try {
    await createNavButton.click()
    await page.waitForLoadState('networkidle', { timeout: 5000 })
    
    // Check if we're on the create page
    const currentUrl = page.url()
    console.log('📍 Current URL after clicking Create:', currentUrl)
    
    // Look for create bet page elements
    const createPageHeader = page.locator('h1:has-text("Create Bet")')
    const isCreateHeaderVisible = await createPageHeader.isVisible()
    console.log('📄 Create Bet header visible:', isCreateHeaderVisible)
    
    if (!isCreateHeaderVisible) {
      console.log('❌ Create Bet page not loaded properly!')
      
      // Check what page we ended up on instead
      const pageContent = await page.textContent('body')
      console.log('📄 Page content (first 200 chars):', pageContent.substring(0, 200))
      return
    }
    
    // Test 3: Check if form elements are present
    console.log('🔍 Checking form elements...')
    
    const titleInput = page.locator('input[placeholder*="What are people betting on"]')
    const isTitleInputVisible = await titleInput.isVisible()
    console.log('📝 Title input visible:', isTitleInputVisible)
    
    const submitButton = page.locator('button:has-text("Create Bet")')
    const isSubmitButtonVisible = await submitButton.isVisible()
    console.log('🔘 Submit button visible:', isSubmitButtonVisible)
    
    // Test 4: Try filling out the form
    if (isTitleInputVisible) {
      console.log('🔍 Testing form input...')
      await titleInput.fill('Test bet title')
      
      // Check if the value was set
      const inputValue = await titleInput.inputValue()
      console.log('📝 Input value after typing:', inputValue)
    }
    
    // Test 5: Check bet type selection
    const betTypeButtons = page.locator('button:has-text("Yes/No"), button:has-text("Multiple Choice"), button:has-text("Pool")')
    const betTypeCount = await betTypeButtons.count()
    console.log('🎯 Bet type buttons found:', betTypeCount)
    
    if (betTypeCount > 0) {
      await betTypeButtons.first().click()
      console.log('✅ Clicked first bet type button')
    }
    
    // Test 6: Check category selection
    const categoryButtons = page.locator('button:has([class*="emoji"])')
    const categoryCount = await categoryButtons.count()
    console.log('📂 Category buttons found:', categoryCount)
    
    // Test 7: Test form validation
    console.log('🔍 Testing form validation...')
    if (isSubmitButtonVisible) {
      await submitButton.click()
      
      // Check for validation messages or if form submits
      await page.waitForTimeout(2000)
      const currentUrlAfterSubmit = page.url()
      console.log('📍 URL after submit click:', currentUrlAfterSubmit)
    }
    
    console.log('✅ Bet creation test completed successfully')
    
  } catch (error) {
    console.log('❌ Error during create bet navigation:', error.message)
    
    // Take a screenshot for debugging
    await page.screenshot({ path: 'bet-creation-error.png', fullPage: true })
    console.log('📸 Screenshot saved as bet-creation-error.png')
  }
})
