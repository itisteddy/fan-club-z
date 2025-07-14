import { chromium } from 'playwright'

async function debugClubs() {
  const browser = await chromium.launch({ headless: false })
  const page = await browser.newPage()
  
  try {
    console.log('🔍 Testing club functionality directly...')
    
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
    
    // Directly navigate to clubs URL
    console.log('🎯 Navigating directly to clubs...')
    await page.goto('http://localhost:3000/clubs')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)
    
    const clubsUrl = page.url()
    console.log('📍 Clubs URL:', clubsUrl)
    
    // Check if we're on the clubs page
    if (clubsUrl.includes('/clubs')) {
      console.log('✅ Successfully navigated to clubs page')
      
      // Check for clubs page content
      const clubsHeader = await page.locator('header h1:has-text("Clubs")').isVisible().catch(() => false)
      console.log('🏆 Clubs header visible:', clubsHeader)
      
      // Check for club categories
      const categoriesVisible = await page.locator('text=Categories').isVisible().catch(() => false)
      console.log('📂 Categories visible:', categoriesVisible)
      
      // Check for club cards
      const clubCards = await page.locator('[data-testid="club-card"]').count().catch(() => 0)
      console.log('🏆 Club cards found:', clubCards)
      
      // Check for join buttons
      const joinButtons = await page.locator('button:has-text("Join")').count().catch(() => 0)
      console.log('➕ Join buttons found:', joinButtons)
      
      // Check for create club button
      const createButton = await page.locator('button:has-text("Create Club")').isVisible().catch(() => false)
      console.log('✨ Create club button visible:', createButton)
      
      // Check for club tabs
      const tabsVisible = await page.locator('[role="tab"]').count().catch(() => 0)
      console.log('📑 Club tabs found:', tabsVisible)
      
      // Try to click on a club card to test navigation
      if (clubCards > 0) {
        console.log('🎯 Testing club card click...')
        try {
          await page.locator('[data-testid="club-card"]').first().click({ timeout: 5000 })
          await page.waitForTimeout(2000)
          
          const detailUrl = page.url()
          console.log('📍 URL after club card click:', detailUrl)
          
          if (detailUrl.includes('/clubs/')) {
            console.log('✅ Successfully navigated to club detail page')
            
            // Check for club detail content
            const clubName = await page.locator('h1').first().textContent().catch(() => 'Not found')
            console.log('🏆 Club name:', clubName)
            
            const membersVisible = await page.locator('text=Members').isVisible().catch(() => false)
            console.log('👥 Members section visible:', membersVisible)
            
            const discussionsVisible = await page.locator('text=Discussions').isVisible().catch(() => false)
            console.log('💬 Discussions section visible:', discussionsVisible)
            
            const statsVisible = await page.locator('text=Statistics').isVisible().catch(() => false)
            console.log('📊 Statistics section visible:', statsVisible)
            
          } else {
            console.log('❌ Failed to navigate to club detail page')
          }
        } catch (error) {
          console.log('❌ Club card click failed:', error.message)
        }
      }
      
      console.log('🎉 Club functionality test completed successfully!')
      
    } else {
      console.log('❌ Failed to navigate to clubs page')
      console.log('📍 Redirected to:', clubsUrl)
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  } finally {
    await browser.close()
  }
}

debugClubs() 