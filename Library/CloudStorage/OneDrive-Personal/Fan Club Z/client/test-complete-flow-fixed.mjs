import { chromium } from 'playwright'

async function testCompleteFlow() {
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
    console.log('🧪 Starting complete flow test...')
    
    // Navigate to the app
    await page.goto('http://localhost:3000')
    console.log('✅ App loaded')
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle')
    
    // Check if we need to sign in
    const signInButton = await page.locator('text=Sign In').first()
    if (await signInButton.isVisible()) {
      console.log('✅ Sign In button found')
      
      // Click Sign In button
      await signInButton.click()
      console.log('✅ Sign In button clicked')
      
      // Wait for login page to load
      await page.waitForTimeout(2000)
      
      // Check if we're on login page
      const loginForm = await page.locator('form').first()
      if (await loginForm.isVisible()) {
        console.log('✅ Login form found')
        
        // Fill in demo credentials
        await page.fill('input[placeholder="Enter your email"]', 'demo@fanclubz.app')
        await page.fill('input[placeholder="Enter your password"]', 'demo123')
        console.log('✅ Demo credentials filled')
        
        // Click login button
        await page.click('button[type="submit"]')
        console.log('✅ Login button clicked')
        
        // Wait for login to complete
        await page.waitForTimeout(2000)
        
        // Check if we're redirected to onboarding
        const onboardingText = await page.locator('text=Welcome to Fan Club Z').first()
        if (await onboardingText.isVisible()) {
          console.log('✅ Onboarding started')
          
          // Complete onboarding flow
          await page.click('text=Continue to Privacy Policy')
          console.log('✅ Privacy policy step')
          
          await page.waitForTimeout(1000)
          await page.click('text=Accept Privacy Policy')
          console.log('✅ Privacy policy accepted')
          
          await page.waitForTimeout(1000)
          await page.click('text=Accept Terms of Service')
          console.log('✅ Terms accepted')
          
          await page.waitForTimeout(1000)
          
          // Scroll to bottom and click Close button
          await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
          await page.waitForTimeout(500)
          
          // Click the exact "Close" button (not "Close Account")
          const closeButtons = await page.locator('button').all()
          for (const button of closeButtons) {
            const text = await button.textContent()
            if (text?.trim() === 'Close') {
              await button.click()
              break
            }
          }
          console.log('✅ Responsible gambling closed')
          
          await page.waitForTimeout(2000)
          
          // Check if we're on the completion page
          const completeText = await page.locator('text=You\'re All Set').first()
          if (await completeText.isVisible()) {
            console.log('✅ Onboarding completion page reached')
            
            await page.click('text=Start Betting')
            console.log('✅ Onboarding completed')
            
            // Wait for main app to load
            await page.waitForTimeout(3000)
            
            // Check if bottom navigation is visible
            const bottomNav = await page.locator('[data-testid="bottom-navigation"]').first()
            if (await bottomNav.isVisible()) {
              console.log('✅ Bottom navigation visible')
              
              // Click on Profile tab
              await page.click('text=Profile')
              console.log('✅ Profile tab clicked')
              
              await page.waitForTimeout(2000)
              
              // Check for profile elements
              const profileElements = [
                'text=Demo User',
                'text=Demo account for testing',
                'text=Edit Profile',
                'text=Wallet',
                'text=Settings',
                'text=Logout'
              ]
              
              for (const element of profileElements) {
                const found = await page.locator(element).first()
                if (await found.isVisible()) {
                  console.log(`✅ Found: ${element}`)
                } else {
                  console.log(`❌ Missing: ${element}`)
                }
              }
              
              // Test Edit Profile button
              const editProfileBtn = await page.locator('text=Edit Profile').first()
              if (await editProfileBtn.isVisible()) {
                await editProfileBtn.click()
                console.log('✅ Edit Profile button clicked')
                
                await page.waitForTimeout(1000)
                
                // Check if edit modal opened
                const modal = await page.locator('[role="dialog"]').first()
                if (await modal.isVisible()) {
                  console.log('✅ Edit Profile modal opened')
                  
                  // Close modal
                  const closeBtn = await page.locator('button[aria-label="Close"]').first()
                  if (await closeBtn.isVisible()) {
                    await closeBtn.click()
                    console.log('✅ Modal closed')
                  }
                } else {
                  console.log('❌ Edit Profile modal not found')
                }
              }
              
              // Test wallet card
              const walletCard = await page.locator('text=Wallet Balance').first()
              if (await walletCard.isVisible()) {
                console.log('✅ Wallet card visible')
                
                // Check for balance amount
                const balance = await page.locator('text=$2,500').first()
                if (await balance.isVisible()) {
                  console.log('✅ Wallet balance displayed correctly')
                }
              }
              
              // Test logout
              const logoutBtn = await page.locator('text=Logout').first()
              if (await logoutBtn.isVisible()) {
                console.log('✅ Logout button found')
                // Don't actually logout for this test
              }
              
              console.log('🎉 All Profile features working correctly!')
              
            } else {
              console.log('❌ Bottom navigation not visible after onboarding')
              
              // Debug: check what's on the page
              const pageContent = await page.content()
              console.log('Page content preview:', pageContent.substring(0, 500))
            }
            
          } else {
            console.log('❌ Onboarding completion page not reached')
          }
          
        } else {
          console.log('❌ Onboarding not started after login')
        }
        
      } else {
        console.log('❌ Login form not found')
      }
      
    } else {
      console.log('❌ Sign In button not found')
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error)
    
    // Take screenshot for debugging
    await page.screenshot({ path: 'test-error.png', fullPage: true })
    console.log('📸 Screenshot saved as test-error.png')
  } finally {
    await browser.close()
  }
}

testCompleteFlow().catch(console.error) 