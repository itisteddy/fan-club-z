#!/usr/bin/env node

import { chromium } from 'playwright'

async function debugBetCardNavigation() {
  console.log('🐛 Debugging Bet Card Navigation and Title Issues...')
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 1000,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  })
  
  const page = await browser.newPage()
  
  try {
    // Add comprehensive console logging from the page
    page.on('console', msg => {
      const text = msg.text()
      if (text.includes('BetCard') || text.includes('DiscoverTab') || text.includes('BetDetailPage') || 
          text.includes('🃏') || text.includes('🔍') || text.includes('✅') || text.includes('❌')) {
        console.log(`📱 Browser Console: ${text}`)
      }
    })
    
    // Navigate to the discover page
    console.log('📱 Step 1: Navigating to Discover page...')
    await page.goto('http://localhost:5173/discover', { waitUntil: 'networkidle' })
    await page.waitForTimeout(3000)
    
    // Check if bet cards are loaded
    const betCards = await page.locator('[data-testid=\"bet-card\"]').count()
    console.log(`📊 Step 2: Found ${betCards} bet cards`)
    
    if (betCards === 0) {
      console.log('❌ No bet cards found! Cannot test navigation.')
      return
    }
    
    // Get details about the first bet card
    console.log('🔍 Step 3: Analyzing first bet card...')
    const firstBetCard = page.locator('[data-testid=\"bet-card\"]').first()
    
    // Get the bet title from the first card
    const betTitle = await firstBetCard.locator('h3').textContent()
    console.log('📝 First bet card title:', betTitle)
    
    // Get all h1 elements on the discover page for reference
    const discoverH1s = await page.locator('h1').allTextContents()
    console.log('📝 All h1 elements on Discover page:', discoverH1s)
    
    // Get the View Details button
    const viewDetailsButton = firstBetCard.locator('button:has-text(\"View Details\")')
    const buttonExists = await viewDetailsButton.count() > 0
    console.log('🔘 View Details button exists:', buttonExists)
    
    if (!buttonExists) {
      console.log('❌ View Details button not found!')
      return
    }
    
    // Get the current URL before clicking
    const initialUrl = page.url()
    console.log('🌐 Initial URL:', initialUrl)
    
    // Click the View Details button
    console.log('🖱️ Step 4: Clicking View Details button...')
    await viewDetailsButton.click()
    
    // Wait for navigation
    await page.waitForTimeout(3000)
    
    // Get the new URL after clicking
    const newUrl = page.url()
    console.log('🌐 New URL after click:', newUrl)
    
    // Check if navigation occurred
    if (newUrl !== initialUrl) {
      console.log('✅ Navigation occurred!')
      
      // Extract the bet ID from the URL
      const urlMatch = newUrl.match(/\\/bets\\/(.+?)(?:\\?|$)/)
      if (urlMatch) {
        const navigatedBetId = urlMatch[1]
        console.log('🆔 Navigated to bet ID:', navigatedBetId)
      }
    } else {
      console.log('❌ No navigation occurred!')
      return
    }
    
    // Wait a moment for the page to fully load
    await page.waitForTimeout(2000)
    
    // Debug: Get ALL text content on the bet detail page
    console.log('\\n🔍 Step 5: Analyzing bet detail page content...')
    
    // Get all h1 elements on the detail page
    const detailH1s = await page.locator('h1').allTextContents()
    console.log('📝 All h1 elements on detail page:', detailH1s)
    
    // Check specifically for the bet title in h1
    const h1WithBetTitle = await page.locator(`h1:has-text(\"${betTitle}\")`).count()
    console.log(`🎯 h1 elements containing \"${betTitle}\": ${h1WithBetTitle}`)
    
    // Get all headings (h1, h2, h3, h4, h5, h6)
    const allHeadings = await page.locator('h1, h2, h3, h4, h5, h6').allTextContents()
    console.log('📝 All headings on detail page:', allHeadings)
    
    // Get the page title
    const pageTitle = await page.title()
    console.log('📄 Page title:', pageTitle)
    
    // Check if there's an error state
    const errorMessage = await page.locator('text=Bet not found').count()
    if (errorMessage > 0) {
      console.log('❌ \"Bet not found\" error message is displayed!')
      
      // Check for the bet ID in the error
      const betIdText = await page.locator('text*=Bet ID:').textContent()
      console.log('🆔 Error page bet ID:', betIdText)
    }
    
    // Look for any elements that might contain the bet title
    const elementsWithTitle = await page.locator(`*:has-text(\"${betTitle}\")`).count()
    console.log(`🔍 Total elements containing bet title: ${elementsWithTitle}`)
    
    // Check for specific bet titles from our mock data
    const bitcoinTitle = 'Will Bitcoin reach $100K by end of 2025?'
    const arsenalTitle = 'Premier League: Man City vs Arsenal - Who wins?'
    const swiftTitle = 'Taylor Swift announces surprise album?'
    
    console.log('\\n🎯 Checking for specific mock bet titles:')
    console.log(`Bitcoin title found: ${await page.locator(`*:has-text(\"${bitcoinTitle}\")`).count() > 0}`)
    console.log(`Arsenal title found: ${await page.locator(`*:has-text(\"${arsenalTitle}\")`).count() > 0}`)
    console.log(`Swift title found: ${await page.locator(`*:has-text(\"${swiftTitle}\")`).count() > 0}`)
    
    // Take screenshots for debugging
    console.log('📸 Taking screenshots...')
    await page.screenshot({ 
      path: '/Users/efe/Library/CloudStorage/OneDrive-Personal/Fan Club Z/client/bet-detail-debug.png',
      fullPage: true 
    })
    
    console.log('\\n📊 SUMMARY:')
    console.log(`✅ Bet cards found: ${betCards}`)
    console.log(`✅ Navigation occurred: ${newUrl !== initialUrl}`)
    console.log(`✅ h1 elements on detail page: ${detailH1s.length}`)
    console.log(`❓ Expected bet title in h1: ${h1WithBetTitle > 0 ? 'YES' : 'NO'}`)
    
    if (h1WithBetTitle === 0) {
      console.log('\\n🚨 ISSUE IDENTIFIED:')
      console.log('- Navigation works, but bet title is not in an h1 element')
      console.log('- This suggests the BetDetailPage is not loading the correct bet data')
      console.log('- Check the console logs above for BetDetailPage debugging info')
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message)
  } finally {
    await browser.close()
  }
}

debugBetCardNavigation()
