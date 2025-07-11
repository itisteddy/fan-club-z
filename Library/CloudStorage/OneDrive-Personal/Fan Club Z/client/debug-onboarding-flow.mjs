import { chromium } from 'playwright';

async function debugOnboardingFlow() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    console.log('🚀 Debugging onboarding flow...');
    
    // Navigate to the login page
    await page.goto('http://localhost:3000/auth/login');
    console.log('✅ Navigated to login page');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
    
    // Click demo login
    const demoButton = await page.locator('button:has-text("Try Demo")').first();
    await demoButton.click();
    console.log('✅ Clicked demo button');
    
    // Wait for navigation
    await page.waitForTimeout(3000);
    
    // Check if we're in onboarding
    const currentUrl = page.url();
    console.log('📍 Current URL:', currentUrl);
    
    // Look for onboarding elements
    const welcomeText = await page.locator('text=Welcome to Fan Club Z').first();
    if (await welcomeText.isVisible()) {
      console.log('✅ Found welcome screen');
      
      // Click continue to privacy policy
      const continueButton = await page.locator('button:has-text("Continue to Privacy Policy")').first();
      await continueButton.click();
      console.log('✅ Clicked continue to privacy policy');
      
      await page.waitForTimeout(2000);
      
      // Check if we're on privacy policy page
      const privacyTitle = await page.locator('text=Privacy Policy').first();
      if (await privacyTitle.isVisible()) {
        console.log('✅ Found privacy policy page');
        
        // Look for accept button
        const acceptButton = await page.locator('button:has-text("Accept Privacy Policy")').first();
        if (await acceptButton.isVisible()) {
          console.log('✅ Found accept button');
          
          // Click accept
          await acceptButton.click();
          console.log('✅ Clicked accept button');
          
          await page.waitForTimeout(2000);
          
          // Check if we moved to terms
          const termsTitle = await page.locator('text=Terms of Service').first();
          if (await termsTitle.isVisible()) {
            console.log('✅ Successfully moved to terms page');
            
            // Accept terms
            const acceptTermsButton = await page.locator('button:has-text("Accept Terms of Service")').first();
            await acceptTermsButton.click();
            console.log('✅ Clicked accept terms');
            
            await page.waitForTimeout(2000);
            
            // Check if we moved to responsible gambling
            const responsibleTitle = await page.locator('text=Responsible Gambling').first();
            if (await responsibleTitle.isVisible()) {
              console.log('✅ Successfully moved to responsible gambling page');
              
                          // Find and click close button - be more specific
            const closeButtons = await page.locator('button').all();
            let closeButtonFound = false;
            for (const button of closeButtons) {
              const text = await button.textContent();
              if (text?.trim() === 'Close') {
                await button.click();
                console.log('✅ Clicked close button');
                closeButtonFound = true;
                break;
              }
            }
            if (!closeButtonFound) {
              console.log('❌ Close button not found');
            }
              
              await page.waitForTimeout(2000);
              
              // Check if we're on complete page
              const completeTitle = await page.locator('text=You\'re All Set!').first();
              if (await completeTitle.isVisible()) {
                console.log('✅ Successfully moved to complete page');
                
                // Click start betting
                const startButton = await page.locator('button:has-text("Start Betting")').first();
                await startButton.click();
                console.log('✅ Clicked start betting');
                
                await page.waitForTimeout(3000);
                
                // Check final URL
                const finalUrl = page.url();
                console.log('📍 Final URL:', finalUrl);
                
                if (finalUrl.includes('/discover')) {
                  console.log('✅ Onboarding completed successfully!');
                } else {
                  console.log('❌ Onboarding did not complete - still on:', finalUrl);
                }
              } else {
                console.log('❌ Did not reach complete page');
              }
            } else {
              console.log('❌ Did not move to responsible gambling page');
            }
          } else {
            console.log('❌ Did not move to terms page');
          }
        } else {
          console.log('❌ Accept button not found');
        }
      } else {
        console.log('❌ Privacy policy page not found');
      }
    } else {
      console.log('❌ Welcome screen not found');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
}

debugOnboardingFlow(); 