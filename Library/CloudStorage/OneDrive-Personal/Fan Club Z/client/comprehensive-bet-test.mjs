#!/usr/bin/env node

import { chromium } from 'playwright'

async function comprehensiveBetCardTest() {
  console.log('🧪 Comprehensive Bet Card Test - Fixing Item 5...')
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 800,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  })
  
  const page = await browser.newPage()
  
  try {
    // Capture all console messages
    page.on('console', msg => {
      const text = msg.text()
      if (text.includes('🃏') || text.includes('🔍') || text.includes('🔗') || text.includes('🎯') || 
          text.includes('BetCard') || text.includes('DiscoverTab') || text.includes('BetDetailPage') ||
          text.includes('✅') || text.includes('❌') || text.includes('🚀')) {
        console.log(`🖥️  ${text}`)
      }
    })
    
    console.log('\n📱 STEP 1: Navigate to Discover page')
    console.log('=' .repeat(50))
    await page.goto('http://localhost:3000/discover', { waitUntil: 'networkidle' })
    await page.waitForTimeout(3000)
    
    console.log('\n📊 STEP 2: Verify bet cards are loaded')
    console.log('=' .repeat(50))
    const betCards = await page.locator('[data-testid=\"bet-card\"]').count()
    console.log(`✅ Found ${betCards} bet cards`)
    
    if (betCards === 0) {
      console.log('❌ CRITICAL: No bet cards found!')
      console.log('This means the core bet card rendering is broken.')
      return
    }
    
    console.log('\n🎯 STEP 3: Analyze first bet card')
    console.log('=' .repeat(50))
    const firstBetCard = page.locator('[data-testid=\"bet-card\"]').first()
    
    // Get bet details from the card
    const betTitle = await firstBetCard.locator('h3').textContent()
    const category = await firstBetCard.locator('span').first().textContent()
    console.log(`📝 Bet Title: \"${betTitle}\"`)
    console.log(`🏷️  Category: \"${category}\"`)
    
    // Verify View Details button exists
    const viewDetailsButton = firstBetCard.locator('button:has-text(\"View Details\")')
    const buttonCount = await viewDetailsButton.count()
    console.log(`🔘 View Details buttons: ${buttonCount}`)
    
    if (buttonCount === 0) {
      console.log('❌ CRITICAL: View Details button not found!')
      return
    }
    
    console.log('\n🌐 STEP 4: Test navigation')
    console.log('=' .repeat(50))
    const initialUrl = page.url()
    console.log(`🌍 Initial URL: ${initialUrl}`)
    
    // Click the button and wait for navigation
    await viewDetailsButton.click()
    await page.waitForTimeout(3000)
    
    const newUrl = page.url()
    console.log(`🌍 New URL: ${newUrl}`)
    
    // Verify navigation occurred
    if (newUrl === initialUrl) {
      console.log('❌ CRITICAL: Navigation did not occur!')
      return
    }
    
    // Extract bet ID from URL
    const urlMatch = newUrl.match(/\/bets\/(.+?)(?:\?|$)/)
    let extractedBetId = null
    if (urlMatch) {
      extractedBetId = urlMatch[1].split('?')[0] // Remove query params
      console.log(`🆔 Extracted Bet ID from URL: "${extractedBetId}"`)
    }
    
    console.log('\n📋 STEP 5: Analyze bet detail page')
    console.log('=' .repeat(50))
    
    // Wait for page to fully load
    await page.waitForTimeout(2000)
    
    // Check for error states first
    const errorMessages = await page.locator('text=Bet not found').count()
    if (errorMessages > 0) {
      console.log('❌ CRITICAL: \"Bet not found\" error displayed!')
      
      const betIdError = await page.locator('text*=Bet ID:').textContent()
      console.log(`🆔 Error shows Bet ID: ${betIdError}`)
      return
    }
    
    // Get all h1 elements
    const h1Elements = await page.locator('h1').allTextContents()
    console.log(`📰 All h1 elements: ${JSON.stringify(h1Elements)}`)
    
    // Check if our expected bet title is in an h1
    const expectedTitleInH1 = h1Elements.some(h1 => h1.includes(betTitle || ''))
    console.log(`🎯 Expected title \"${betTitle}\" found in h1: ${expectedTitleInH1}`)
    
    // Check for specific mock bet titles
    const mockTitles = [
      'Will Bitcoin reach $100K by end of 2025?',
      'Premier League: Man City vs Arsenal - Who wins?', 
      'Taylor Swift announces surprise album?'
    ]
    
    console.log('\n🎭 STEP 6: Check for mock bet titles')
    console.log('=' .repeat(50))
    
    for (const mockTitle of mockTitles) {
      const found = h1Elements.some(h1 => h1.includes(mockTitle))
      console.log(`${found ? '✅' : '❌'} \"${mockTitle.substring(0, 40)}...\" in h1: ${found}`)
      
      if (found && mockTitle.includes(betTitle || '')) {
        console.log(`🎯 MATCH FOUND: This appears to be the correct bet!`)
      }
    }
    
    // Get all text content to see what's actually on the page
    const allText = await page.textContent('body')
    const hasBetTitle = allText?.includes(betTitle || '') || false
    console.log(`📄 Bet title found anywhere on page: ${hasBetTitle}`)
    
    console.log('\n📸 STEP 7: Take screenshots for debugging')
    console.log('=' .repeat(50))
    await page.screenshot({ 
      path: '/Users/efe/Library/CloudStorage/OneDrive-Personal/Fan Club Z/client/comprehensive-bet-test.png',
      fullPage: true 
    })
    console.log('📸 Screenshot saved as comprehensive-bet-test.png')
    
    console.log('\n🏁 FINAL ANALYSIS')
    console.log('=' .repeat(50))
    
    if (betCards > 0 && newUrl !== initialUrl && h1Elements.length > 0) {
      if (expectedTitleInH1) {
        console.log('✅ SUCCESS: Bet cards loading and navigation working perfectly!')
      } else {
        console.log('⚠️  ISSUE IDENTIFIED: Navigation works but wrong bet data is displayed')
        console.log('📝 This suggests:')
        console.log('   1. BetDetailPage is not finding the correct bet by ID')
        console.log('   2. Or BetDetailPage is falling back to different mock data')
        console.log('   3. Check console logs above for BetDetailPage debugging info')
      }
    } else {
      console.log('❌ CRITICAL FAILURE: Core functionality is broken')
    }
    
    // Summary table
    console.log('\n📊 TEST RESULTS SUMMARY')
    console.log('=' .repeat(50))
    console.log(`Bet cards rendered: ${betCards > 0 ? '✅ YES' : '❌ NO'}`)
    console.log(`Navigation worked: ${newUrl !== initialUrl ? '✅ YES' : '❌ NO'}`)
    console.log(`H1 elements found: ${h1Elements.length > 0 ? '✅ YES' : '❌ NO'}`)
    console.log(`Expected title in h1: ${expectedTitleInH1 ? '✅ YES' : '❌ NO'}`)
    console.log(`Error state: ${errorMessages > 0 ? '❌ YES' : '✅ NO'}`)
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message)
  } finally {
    await browser.close()
  }
}

comprehensiveBetCardTest()
