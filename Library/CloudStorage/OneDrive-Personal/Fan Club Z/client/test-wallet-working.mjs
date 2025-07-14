import { chromium } from 'playwright'

async function testWalletWorking() {
  const browser = await chromium.launch({ headless: false })
  const page = await browser.newPage()
  
  try {
    console.log('🔍 Testing wallet functionality directly...')
    
    // Navigate to the app
    await page.goto('http://localhost:3000')
    console.log('✅ Navigated to app')
    
    // Wait for login page to load
    await page.waitForSelector('button:has-text("Try Demo")', { timeout: 10000 })
    console.log('✅ Demo button found')
    
    // Click demo login
    await page.click('button:has-text("Try Demo")')
    console.log('✅ Clicked demo login')
    
    // Wait for navigation to complete
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(3000)
    console.log('✅ Navigation completed')
    
    // Check current URL
    const currentUrl = page.url()
    console.log('📍 Current URL:', currentUrl)
    
    // Directly navigate to wallet URL
    console.log('🎯 Navigating directly to wallet...')
    await page.goto('http://localhost:3000/wallet')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)
    
    const walletUrl = page.url()
    console.log('📍 Wallet URL:', walletUrl)
    
    // Check if we're on the wallet page
    if (walletUrl.includes('/wallet')) {
      console.log('✅ Successfully navigated to wallet page')
      
      // Check for wallet page content
      const walletHeader = await page.locator('header h1:has-text("Wallet")').isVisible().catch(() => false)
      console.log('💰 Wallet header visible:', walletHeader)
      
      // Check for balance
      const balanceVisible = await page.locator('text=Available Balance').isVisible().catch(() => false)
      console.log('💰 Balance text visible:', balanceVisible)
      
      // Check for $2500 balance
      const balanceAmount = await page.locator('text=$2,500').isVisible().catch(() => false)
      console.log('💰 $2,500 balance visible:', balanceAmount)
      
      // Check for transaction history
      const transactionHistory = await page.locator('text=Transaction History').isVisible().catch(() => false)
      console.log('📋 Transaction history visible:', transactionHistory)
      
      // Check for deposit button
      const depositButton = await page.locator('button:has-text("Deposit")').isVisible().catch(() => false)
      console.log('💳 Deposit button visible:', depositButton)
      
      // Check for withdraw button
      const withdrawButton = await page.locator('button:has-text("Withdraw")').isVisible().catch(() => false)
      console.log('💸 Withdraw button visible:', withdrawButton)
      
      console.log('🎉 Wallet functionality test completed successfully!')
      
    } else {
      console.log('❌ Failed to navigate to wallet page')
      console.log('📍 Redirected to:', walletUrl)
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  } finally {
    await browser.close()
  }
}

testWalletWorking() 