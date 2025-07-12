#!/usr/bin/env node

import { chromium } from 'playwright'

async function testBetCardsLoading() {
  console.log('🧪 Testing Bet Cards Loading - Comprehensive Test...')
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 500,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  })
  
  const page = await browser.newPage()
  
  try {
    // Add console logging from the page
    page.on('console', msg => {
      if (msg.text().includes('BetCard') || msg.text().includes('DiscoverTab') || msg.text().includes('🃏') || msg.text().includes('🔍')) {
        console.log(`📱 Browser Console: ${msg.text()}`)
      }
    })
    
    // Navigate to the discover page directly (no auth needed)
    console.log('📱 Navigating to Discover page...')
    await page.goto('http://localhost:5173/discover', { waitUntil: 'networkidle' })
    
    // Wait for initial load
    await page.waitForTimeout(3000)
    
    // Check if the page loaded correctly
    const pageTitle = await page.textContent('h1')
    console.log('📄 Page title:', pageTitle)
    
    // Look for the "Trending Now" section
    const trendingSection = await page.locator('text=Trending Now').count()
    console.log('📊 Trending section found:', trendingSection > 0)
    
    // Check for bet cards using multiple selectors
    const betCardsByTestId = await page.locator('[data-testid=\"bet-card\"]').count()
    console.log('🃏 Bet cards by data-testid:', betCardsByTestId)
    
    // Check for bet card content (should have these texts from mock data)
    const bitcoinBet = await page.locator('text=Bitcoin').count()
    console.log('₿ Bitcoin bet found:', bitcoinBet > 0)
    
    const arsenalBet = await page.locator('text=Arsenal').count()
    console.log('⚽ Arsenal bet found:', arsenalBet > 0)
    
    const swiftBet = await page.locator('text=Taylor Swift').count()
    console.log('🎭 Taylor Swift bet found:', swiftBet > 0)
    
    // Check for "View Details" buttons
    const viewDetailsButtons = await page.locator('button:has-text(\"View Details\")').count()
    console.log('🔘 View Details buttons:', viewDetailsButtons)
    
    // Look for Apple-inspired styling elements
    const roundedCards = await page.locator('.rounded-xl').count()
    console.log('📱 Rounded cards found:', roundedCards)
    
    // Check for category badges
    const cryptoBadge = await page.locator('text=CRYPTO').count()
    console.log('🏷️ Crypto category badge:', cryptoBadge > 0)
    
    // Take a screenshot for manual verification
    console.log('📸 Taking screenshot...')
    await page.screenshot({ 
      path: '/Users/efe/Library/CloudStorage/OneDrive-Personal/Fan Club Z/client/bet-cards-test-result.png',
      fullPage: true 
    })
    
    // Test clicking on a bet card
    if (betCardsByTestId > 0) {
      console.log('🔄 Testing bet card interaction...')
      await page.locator('[data-testid=\"bet-card\"]').first().click()
      await page.waitForTimeout(2000)
      
      // Check if navigation occurred
      const currentUrl = page.url()
      console.log('🌐 Current URL after click:', currentUrl)
      
      if (currentUrl.includes('/bets/')) {
        console.log('✅ Navigation to bet detail page successful!')
      } else {
        console.log('❌ Navigation did not occur as expected')
      }
    }
    
    // Summary
    console.log('\n📊 SUMMARY:')
    console.log(`✅ Bet cards found: ${betCardsByTestId}`)
    console.log(`✅ View Details buttons: ${viewDetailsButtons}`)
    console.log(`✅ Mock data bets found: ${bitcoinBet > 0 && arsenalBet > 0 && swiftBet > 0}`)
    
    if (betCardsByTestId >= 3 && viewDetailsButtons >= 3) {
      console.log('🎉 SUCCESS: Bet cards are loading correctly!')
    } else {
      console.log('❌ ISSUE: Bet cards are not loading as expected')
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message)
  } finally {
    await browser.close()
  }
}

testBetCardsLoading()
