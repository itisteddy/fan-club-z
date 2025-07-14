#!/usr/bin/env node

import { chromium } from 'playwright'

async function testClubManagement() {
  console.log('🧪 Testing Club Management Fix...')
  
  const browser = await chromium.launch({ 
    headless: false,
    args: ['--disable-web-security', '--disable-features=VizDisplayCompositor']
  })
  
  try {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
    })
    
    const page = await context.newPage()
    
    // Enable console logging
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('❌ Browser Error:', msg.text())
      }
    })
    
    // Step 1: Navigate to app
    console.log('📱 Step 1: Navigate to app')
    await page.goto('http://localhost:5173')
    await page.waitForTimeout(2000)
    
    // Step 2: Login as demo user
    console.log('👤 Step 2: Login as demo user')
    try {
      await page.fill('input[type="email"]', 'demo@fanclubz.app')
      await page.fill('input[type="password"]', 'demo123')
      await page.click('button[type="submit"]')
      await page.waitForTimeout(3000)
    } catch (error) {
      console.log('⚠️ Login might already be active, continuing...')
    }
    
    // Step 3: Navigate to Clubs tab
    console.log('🏛️ Step 3: Navigate to Clubs tab')
    
    // Try clicking the Clubs tab in bottom navigation
    try {
      await page.click('text=Clubs')
      await page.waitForTimeout(2000)
    } catch (error) {
      console.log('⚠️ Could not find Clubs tab, trying direct navigation...')
      await page.goto('http://localhost:5173/clubs')
      await page.waitForTimeout(2000)
    }
    
    // Step 4: Check if clubs list loads
    console.log('📋 Step 4: Check clubs list')
    
    // Wait for clubs list or loading state
    try {
      await page.waitForSelector('[data-testid="clubs-list"]', { timeout: 10000 })
      console.log('✅ Clubs list element found')
      
      // Check for loading state
      const loadingElement = await page.$('[data-testid="clubs-loading"]')
      if (loadingElement) {
        console.log('⏳ Clubs are loading...')
        await page.waitForSelector('[data-testid="club-card"]', { timeout: 15000 })
      }
      
      // Count club cards
      const clubCards = await page.$$('[data-testid="club-card"]')
      console.log(`📊 Found ${clubCards.length} club cards`)
      
      if (clubCards.length === 0) {
        console.log('❌ No club cards found')
        return false
      }
      
    } catch (error) {
      console.log('❌ Failed to find clubs list:', error.message)
      return false
    }
    
    // Step 5: Test club navigation
    console.log('🔗 Step 5: Test club navigation')
    
    try {
      // Click on the first club card
      const firstClubCard = await page.$('[data-testid="club-card"]')
      if (firstClubCard) {
        // Look for a "View Club" button or club title link
        const viewButton = await firstClubCard.$('[data-testid="view-club-button"]')
        const joinButton = await firstClubCard.$('[data-testid="join-club-button"]')
        
        if (viewButton) {
          console.log('👁️ Clicking View Club button')
          await viewButton.click()
          await page.waitForTimeout(3000)
          
          // Check if we navigated to club detail page
          const currentUrl = page.url()
          if (currentUrl.includes('/clubs/')) {
            console.log('✅ Successfully navigated to club detail page')
          } else {
            console.log('❌ Did not navigate to club detail page')
            return false
          }
          
        } else if (joinButton) {
          console.log('🤝 Clicking Join Club button')
          await joinButton.click()
          await page.waitForTimeout(2000)
          
          // Check for success message or view button appearing
          const successMessage = await page.textContent('body')
          if (successMessage.includes('joined') || successMessage.includes('success')) {
            console.log('✅ Successfully joined club')
          } else {
            console.log('⚠️ No clear success message after joining')
          }
          
        } else {
          console.log('❌ No View Club or Join Club button found')
          return false
        }
      } else {
        console.log('❌ No club card found to click')
        return false
      }
      
    } catch (error) {
      console.log('❌ Failed to test club navigation:', error.message)
      return false
    }
    
    console.log('✅ Club Management test completed successfully!')
    return true
    
  } catch (error) {
    console.log('❌ Test failed:', error.message)
    return false
  } finally {
    await browser.close()
  }
}

// Run the test
testClubManagement().then(success => {
  if (success) {
    console.log('🎉 All Club Management tests passed!')
    process.exit(0)
  } else {
    console.log('💥 Club Management tests failed!')
    process.exit(1)
  }
}).catch(error => {
  console.error('💥 Test runner failed:', error)
  process.exit(1)
})
