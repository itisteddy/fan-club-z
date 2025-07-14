import { test, expect } from '@playwright/test'

test('debug bet creation navigation and form', async ({ page }) => {
  console.log('🧪 Starting bet creation debug test...')
  
  // Navigate to the app with a longer timeout
  console.log('🔗 Navigating to app...')
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle', timeout: 30000 })
  
  // Check if demo login button exists and click it
  console.log('🔑 Looking for demo login...')
  try {
    const demoLoginButton = page.locator('button:has-text("Demo Login")')
    if (await demoLoginButton.isVisible({ timeout: 5000 })) {
      console.log('✅ Demo login button found, clicking...')
      await demoLoginButton.click()
      await page.waitForTimeout(2000)
    } else {
      console.log('⚠️ Demo login button not found, checking if already logged in')
    }
  } catch (error) {
    console.log('⚠️ Demo login step failed:', error.message)
  }
  
  // Wait for bottom navigation to appear
  console.log('🔍 Waiting for bottom navigation...')
  await page.waitForSelector('[data-testid="bottom-navigation"]', { timeout: 15000 })
  console.log('✅ Bottom navigation found')
  
  // Take a screenshot to see current state
  await page.screenshot({ path: 'before-create-nav.png', fullPage: true })
  console.log('📸 Screenshot saved: before-create-nav.png')
  
  // Check which tabs are visible in navigation
  console.log('🔍 Checking visible navigation tabs...')
  const navButtons = await page.locator('[data-testid^="nav-"]').all()
  for (let i = 0; i < navButtons.length; i++) {
    const button = navButtons[i]
    const text = await button.textContent()
    const testId = await button.getAttribute('data-testid')
    const isVisible = await button.isVisible()
    console.log(`📱 Nav button ${i}: ${testId} - "${text}" - visible: ${isVisible}`)
  }
  
  // Look specifically for Create button
  console.log('🔍 Looking for Create navigation button...')
  const createNavButton = page.locator('[data-testid="nav-create"]')
  const isCreateNavVisible = await createNavButton.isVisible()
  console.log('📱 Create nav button visible:', isCreateNavVisible)
  
  if (!isCreateNavVisible) {
    console.log('❌ Create navigation button not found!')
    
    // Check if user is authenticated
    const signInButton = page.locator('[data-testid="nav-sign-in"]')
    const isSignInVisible = await signInButton.isVisible()
    console.log('🔐 Sign in button visible (means not authenticated):', isSignInVisible)
    
    // Let's try to authenticate properly first
    if (isSignInVisible) {
      console.log('🔑 Attempting authentication...')
      await signInButton.click()
      await page.waitForTimeout(1000)
      
      // Take screenshot of auth page
      await page.screenshot({ path: 'auth-page.png', fullPage: true })
      console.log('📸 Auth page screenshot saved')
      
      // Look for demo login option on auth page
      const demoOption = page.locator('button:has-text("Demo Login")')
      if (await demoOption.isVisible({ timeout: 3000 })) {
        console.log('🔑 Demo login found on auth page, clicking...')
        await demoOption.click()
        await page.waitForTimeout(3000)
        
        // Check if we're back to main app
        await page.waitForSelector('[data-testid="bottom-navigation"]', { timeout: 10000 })
        console.log('✅ Back to main app after authentication')
        
        // Check for Create button again
        const createNavAfterAuth = page.locator('[data-testid="nav-create"]')
        const isCreateNavVisibleAfterAuth = await createNavAfterAuth.isVisible()
        console.log('📱 Create nav button visible after auth:', isCreateNavVisibleAfterAuth)
      }
    }
    
    return // Exit if we can't find create button
  }
  
  // Try to click Create navigation
  console.log('🖱️ Clicking Create navigation button...')
  await createNavButton.click()
  await page.waitForTimeout(2000)
  
  // Check what page we ended up on
  const currentUrl = page.url()
  console.log('📍 Current URL after Create click:', currentUrl)
  
  // Take screenshot after navigation
  await page.screenshot({ path: 'after-create-nav.png', fullPage: true })
  console.log('📸 Screenshot saved: after-create-nav.png')
  
  // Look for Create Bet page header
  console.log('🔍 Looking for Create Bet page elements...')
  const createBetHeader = page.locator('h1:has-text("Create Bet")')
  const isCreateHeaderVisible = await createBetHeader.isVisible({ timeout: 5000 })
  console.log('📄 Create Bet header visible:', isCreateHeaderVisible)
  
  if (!isCreateHeaderVisible) {
    console.log('❌ Create Bet page not loaded!')
    
    // Check what content is actually showing
    const pageHeaders = await page.locator('h1').all()
    console.log('📄 Available headers on page:')
    for (let i = 0; i < pageHeaders.length; i++) {
      const headerText = await pageHeaders[i].textContent()
      const isVisible = await pageHeaders[i].isVisible()
      console.log(`   H1 ${i}: "${headerText}" - visible: ${isVisible}`)
    }
    
    return
  }
  
  console.log('✅ Successfully navigated to Create Bet page!')
  
  // Now test form elements
  console.log('🔍 Testing form elements...')
  
  // Check bet type buttons
  const betTypeButtons = page.locator('button:has-text("Yes/No"), button:has-text("Multiple Choice"), button:has-text("Pool")')
  const betTypeCount = await betTypeButtons.count()
  console.log('🎯 Bet type buttons found:', betTypeCount)
  
  // Check title input
  const titleInput = page.locator('input[placeholder*="What are people betting on"]')
  const isTitleInputVisible = await titleInput.isVisible()
  console.log('📝 Title input visible:', isTitleInputVisible)
  
  if (isTitleInputVisible) {
    console.log('📝 Testing title input...')
    await titleInput.fill('Test bet creation')
    const inputValue = await titleInput.inputValue()
    console.log('📝 Title input value after typing:', inputValue)
  }
  
  // Check description textarea
  const descriptionTextarea = page.locator('textarea[placeholder*="Provide more details"]')
  const isDescriptionVisible = await descriptionTextarea.isVisible()
  console.log('📝 Description textarea visible:', isDescriptionVisible)
  
  if (isDescriptionVisible) {
    console.log('📝 Testing description textarea...')
    await descriptionTextarea.fill('This is a test bet description')
    const textareaValue = await descriptionTextarea.inputValue()
    console.log('📝 Description value after typing:', textareaValue)
  }
  
  // Check category buttons
  const categoryButtons = page.locator('button:has([class*="emoji"]), button:has-text("Sports"), button:has-text("Pop Culture")')
  const categoryCount = await categoryButtons.count()
  console.log('📂 Category buttons found:', categoryCount)
  
  if (categoryCount > 0) {
    console.log('📂 Testing category selection...')
    const firstCategory = categoryButtons.first()
    await firstCategory.click()
    console.log('✅ Clicked first category button')
  }
  
  // Check deadline input
  const deadlineInput = page.locator('input[type="datetime-local"]')
  const isDeadlineVisible = await deadlineInput.isVisible()
  console.log('📅 Deadline input visible:', isDeadlineVisible)
  
  if (isDeadlineVisible) {
    console.log('📅 Testing deadline input...')
    // Set a future date
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 7)
    const dateString = futureDate.toISOString().slice(0, 16)
    await deadlineInput.fill(dateString)
    const dateValue = await deadlineInput.inputValue()
    console.log('📅 Deadline value after setting:', dateValue)
  }
  
  // Check stake inputs
  const minStakeInput = page.locator('input[type="number"]').first()
  const maxStakeInput = page.locator('input[type="number"]').last()
  const isMinStakeVisible = await minStakeInput.isVisible()
  const isMaxStakeVisible = await maxStakeInput.isVisible()
  console.log('💰 Min stake input visible:', isMinStakeVisible)
  console.log('💰 Max stake input visible:', isMaxStakeVisible)
  
  // Check submit button
  const submitButton = page.locator('button:has-text("Create Bet")')
  const isSubmitButtonVisible = await submitButton.isVisible()
  const isSubmitButtonEnabled = await submitButton.isEnabled()
  console.log('🔘 Submit button visible:', isSubmitButtonVisible)
  console.log('🔘 Submit button enabled:', isSubmitButtonEnabled)
  
  // Test form validation
  if (isSubmitButtonVisible && isSubmitButtonEnabled) {
    console.log('🔍 Testing form submission...')
    await submitButton.click()
    await page.waitForTimeout(3000)
    
    // Check if form submitted or if validation errors appeared
    const currentUrlAfterSubmit = page.url()
    console.log('📍 URL after form submission:', currentUrlAfterSubmit)
    
    // Look for success/error messages
    const errorMessages = await page.locator('[class*="error"], [class*="alert"]').all()
    if (errorMessages.length > 0) {
      console.log('⚠️ Form validation errors found:')
      for (let i = 0; i < errorMessages.length; i++) {
        const errorText = await errorMessages[i].textContent()
        console.log(`   Error ${i}: ${errorText}`)
      }
    }
    
    // Take final screenshot
    await page.screenshot({ path: 'after-form-submit.png', fullPage: true })
    console.log('📸 Final screenshot saved: after-form-submit.png')
  }
  
  console.log('✅ Bet creation test completed')
})
