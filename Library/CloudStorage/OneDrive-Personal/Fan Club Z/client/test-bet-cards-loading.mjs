#!/usr/bin/env node

import { chromium } from 'playwright'

async function testBetCardsLoading() {
  console.log('🧪 Testing Bet Cards Loading...')
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 1000,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  })
  
  const page = await browser.newPage()
  
  try {
    // Navigate to app
    console.log('📱 Navigating to app...')
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' })
    
    // Wait for initial load
    await page.waitForTimeout(2000)
    
    // Try demo login
    console.log('🔐 Attempting demo login...')
    try {
      await page.getByTestId('demo-login-button').click({ timeout: 5000 })
      await page.waitForTimeout(3000)
    } catch (e) {
      console.log('No demo login needed or available')
    }
    
    // Navigate to Discover tab
    console.log('🔍 Navigating to Discover tab...')
    try {
      await page.getByText('Discover').first().click({ timeout: 5000 })
      await page.waitForTimeout(2000)
    } catch (e) {
      console.log('Already on Discover or navigation not needed')
    }
    
    // Check page content
    console.log('📄 Checking page content...')
    const pageContent = await page.content()
    console.log('Page title includes Discover:', pageContent.includes('Discover'))
    
    // Look for bet cards with various selectors
    console.log('🃏 Looking for bet cards...')
    
    // Test data-testid selector (what tests expect)
    const betCardsByTestId = await page.locator('[data-testid="bet-card"]').count()
    console.log('Bet cards by data-testid:', betCardsByTestId)
    
    // Test other potential selectors
    const betCardsByClass = await page.locator('.bg-white.rounded-xl').count()
    console.log('Bet cards by CSS classes:', betCardsByClass)
    
    // Look for BetCard components
    const betCardElements = await page.locator('div:has(h3):has(button:has-text("View Details"))').count()
    console.log('Bet card-like elements:', betCardElements)
    
    // Check for specific bet titles
    const bitcoinBet = await page.locator('text=Bitcoin').count()
    console.log('Bitcoin bet text found:', bitcoinBet)
    
    const arsenalBet = await page.locator('text=Arsenal').count()
    console.log('Arsenal bet text found:', arsenalBet)
    
    // Check for "Trending Now" section
    const trendingSection = await page.locator('text=Trending Now').count()
    console.log('Trending Now section found:', trendingSection)
    
    // Take screenshot for debugging
    console.log('📸 Taking screenshot...')
    await page.screenshot({ 
      path: '/Users/efe/Library/CloudStorage/OneDrive-Personal/Fan Club Z/client/bet-cards-debug.png',
      fullPage: true 
    })
    
    // Check network requests for bet data
    console.log('🌐 Checking network activity...')
    
    page.on('response', response => {
      if (response.url().includes('/api/bets')) {
        console.log(`API Response: ${response.status()} ${response.url()}`)
      }
    })
    
    // Try to trigger bet loading
    await page.reload({ waitUntil: 'networkidle' })
    await page.waitForTimeout(3000)
    
    // Final check
    const finalBetCardCount = await page.locator('[data-testid="bet-card"]').count()
    console.log('Final bet card count:', finalBetCardCount)
    
    if (finalBetCardCount > 0) {
      console.log('✅ Bet cards are loading!')
    } else {
      console.log('❌ Bet cards are NOT loading')
      
      // Check for error messages
      const errorText = await page.locator('text=Unable to load bets').count()
      console.log('Error message found:', errorText > 0)
      
      // Check for empty state
      const emptyState = await page.locator('text=No Bets Found').count()
      console.log('Empty state found:', emptyState > 0)
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  } finally {
    await browser.close()
  }
}

testBetCardsLoading()
