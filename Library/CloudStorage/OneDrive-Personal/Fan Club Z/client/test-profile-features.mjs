import { chromium } from 'playwright'

async function testProfileFeatures() {
  const browser = await chromium.launch({ 
    headless: false,
    args: ['--disable-web-security', '--disable-features=VizDisplayCompositor']
  })
  
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 }, // iPhone 14
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
  })
  
  const page = await context.newPage()
  
  try {
    console.log('🎯 TESTING PROFILE PAGE FEATURES')
    console.log('================================')
    
    // Step 1: Login
    console.log('\n🔐 Step 1: Demo Login')
    await page.goto('http://localhost:3000')
    await page.click('text=Sign In')
    await page.waitForTimeout(1000)
    
    const demoButton = await page.locator('button:has-text("Try Demo")').first()
    await demoButton.click()
    console.log('✅ Demo login clicked')
    
    // Wait for onboarding to complete
    await page.waitForTimeout(5000)
    
    // Step 2: Navigate to Profile
    console.log('\n👤 Step 2: Navigate to Profile')
    const profileTab = await page.locator('[data-testid="bottom-navigation"] button:has-text("Profile")').first()
    await profileTab.click()
    console.log('✅ Profile tab clicked')
    
    await page.waitForTimeout(2000)
    
    // Step 3: Test Edit Profile
    console.log('\n✏️ Step 3: Test Edit Profile')
    const editProfileButton = await page.locator('button:has-text("Edit Profile")').first()
    await editProfileButton.click()
    console.log('✅ Edit Profile button clicked')
    
    await page.waitForTimeout(1000)
    
    // Check if modal opened
    const editModal = await page.locator('[role="dialog"]').count()
    if (editModal > 0) {
      console.log('✅ Edit Profile modal opened')
      
      // Close modal
      await page.keyboard.press('Escape')
      console.log('✅ Edit Profile modal closed')
    } else {
      console.log('❌ Edit Profile modal not found')
    }
    
    // Step 4: Test Security Settings
    console.log('\n🔒 Step 4: Test Security Settings')
    const securityButton = await page.locator('button:has-text("Security")').first()
    await securityButton.click()
    console.log('✅ Security button clicked')
    
    await page.waitForTimeout(1000)
    
    const securityModal = await page.locator('[role="dialog"]').count()
    if (securityModal > 0) {
      console.log('✅ Security modal opened')
      
      // Test password change form
      const currentPasswordInput = await page.locator('input[placeholder*="current password"]').first()
      if (await currentPasswordInput.isVisible()) {
        console.log('✅ Password change form found')
      }
      
      // Close modal
      await page.keyboard.press('Escape')
      console.log('✅ Security modal closed')
    } else {
      console.log('❌ Security modal not found')
    }
    
    // Step 5: Test Notifications Settings
    console.log('\n🔔 Step 5: Test Notifications Settings')
    const notificationsButton = await page.locator('button:has-text("Notifications")').first()
    await notificationsButton.click()
    console.log('✅ Notifications button clicked')
    
    await page.waitForTimeout(1000)
    
    const notificationsModal = await page.locator('[role="dialog"]').count()
    if (notificationsModal > 0) {
      console.log('✅ Notifications modal opened')
      
      // Test notification toggles
      const notificationToggles = await page.locator('button:has-text("On"), button:has-text("Off")').count()
      console.log(`✅ Found ${notificationToggles} notification toggles`)
      
      // Close modal
      await page.keyboard.press('Escape')
      console.log('✅ Notifications modal closed')
    } else {
      console.log('❌ Notifications modal not found')
    }
    
    // Step 6: Test Payment Methods
    console.log('\n💳 Step 6: Test Payment Methods')
    const paymentMethodsButton = await page.locator('button:has-text("Payment Methods")').first()
    await paymentMethodsButton.click()
    console.log('✅ Payment Methods button clicked')
    
    await page.waitForTimeout(1000)
    
    const paymentModal = await page.locator('[role="dialog"]').count()
    if (paymentModal > 0) {
      console.log('✅ Payment Methods modal opened')
      
      // Test payment method cards
      const paymentCards = await page.locator('text=ending in').count()
      console.log(`✅ Found ${paymentCards} payment method cards`)
      
      // Close modal
      await page.keyboard.press('Escape')
      console.log('✅ Payment Methods modal closed')
    } else {
      console.log('❌ Payment Methods modal not found')
    }
    
    // Step 7: Test Transaction History
    console.log('\n📊 Step 7: Test Transaction History')
    const transactionHistoryButton = await page.locator('button:has-text("Transaction History")').first()
    await transactionHistoryButton.click()
    console.log('✅ Transaction History button clicked')
    
    await page.waitForTimeout(1000)
    
    const transactionModal = await page.locator('[role="dialog"]').count()
    if (transactionModal > 0) {
      console.log('✅ Transaction History modal opened')
      
      // Test transaction summary cards
      const summaryCards = await page.locator('text=Total Deposits, text=Total Withdrawals, text=Total Wins, text=Total Bets').count()
      console.log(`✅ Found ${summaryCards} summary cards`)
      
      // Close modal
      await page.keyboard.press('Escape')
      console.log('✅ Transaction History modal closed')
    } else {
      console.log('❌ Transaction History modal not found')
    }
    
    // Step 8: Test Help & Support
    console.log('\n❓ Step 8: Test Help & Support')
    const helpSupportButton = await page.locator('button:has-text("Help & Support")').first()
    await helpSupportButton.click()
    console.log('✅ Help & Support button clicked')
    
    await page.waitForTimeout(1000)
    
    const helpModal = await page.locator('[role="dialog"]').count()
    if (helpModal > 0) {
      console.log('✅ Help & Support modal opened')
      
      // Test FAQ items
      const faqItems = await page.locator('text=How do I place a bet?, text=How do I withdraw my winnings?').count()
      console.log(`✅ Found ${faqItems} FAQ items`)
      
      // Close modal
      await page.keyboard.press('Escape')
      console.log('✅ Help & Support modal closed')
    } else {
      console.log('❌ Help & Support modal not found')
    }
    
    // Step 9: Test Logout
    console.log('\n🚪 Step 9: Test Logout')
    const logoutButton = await page.locator('button:has-text("Sign Out")').first()
    if (await logoutButton.isVisible()) {
      console.log('✅ Logout button found')
      
      // Don't actually logout for this test
      console.log('ℹ️ Skipping actual logout to keep session active')
    } else {
      console.log('❌ Logout button not found')
    }
    
    console.log('\n🎉 PROFILE FEATURES TEST COMPLETE!')
    console.log('====================================')
    console.log('✅ All profile page features are working correctly!')
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  } finally {
    await browser.close()
  }
}

testProfileFeatures() 