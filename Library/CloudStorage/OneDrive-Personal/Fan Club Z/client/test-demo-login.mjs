import { chromium } from '@playwright/test';

async function testDemoLogin() {
  console.log('🎯 Testing Demo Login & Profile Features...\n');
  
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Navigate to app
    console.log('📱 Loading app...');
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Use Demo login instead of regular login
    console.log('\n🔐 Step 1: Demo login process');
    
    // Click Sign In to get to login page
    await page.click('button:has-text("Sign In")');
    await page.waitForTimeout(1000);
    
    // Use the "Try Demo" button instead of regular login
    const tryDemoButton = await page.locator('text=Try Demo').count();
    if (tryDemoButton > 0) {
      console.log('   ✅ Found "Try Demo" button');
      await page.click('text=Try Demo');
      await page.waitForTimeout(3000);
    } else {
      console.log('   ❌ Try Demo button not found');
      return;
    }
    
    // Check if demo login was successful
    const isAuthenticated = await page.evaluate(() => {
      return localStorage.getItem('auth_token') !== null;
    });
    
    console.log(`   Is authenticated: ${isAuthenticated}`);
    
    if (!isAuthenticated) {
      console.log('   ❌ Demo login failed');
      return;
    }
    
    // Wait for page to fully load after login
    await page.waitForTimeout(2000);
    
    // Check current URL
    const currentUrl = page.url();
    console.log(`\n📍 Current URL: ${currentUrl}`);
    
    // Check what's on the page
    const pageText = await page.evaluate(() => {
      return document.body.innerText;
    });
    
    // Check if we're on onboarding/compliance page
    const isOnboarding = pageText.includes('Privacy Policy') || pageText.includes('Terms of Service') || pageText.includes('Responsible Gambling');
    
    if (isOnboarding) {
      console.log('\n📋 Step 2: Completing onboarding flow');
      console.log('   User is in compliance onboarding - completing this first');
      
      // Click through the onboarding
      const continueButton = await page.locator('text=Continue to Privacy Policy').count();
      if (continueButton > 0) {
        console.log('   ✅ Found "Continue to Privacy Policy" button');
        
        await page.click('text=Continue to Privacy Policy');
        await page.waitForTimeout(2000);
        
        // Continue clicking through onboarding steps
        let onboardingStep = 1;
        while (onboardingStep <= 5) { // Limit to prevent infinite loop
          const newPageText = await page.evaluate(() => {
            return document.body.innerText;
          });
          
          if (newPageText.includes('Discover') || newPageText.includes('My Bets')) {
            console.log('   ✅ Successfully completed onboarding - now on main app');
            break;
          }
          
          // Look for continue/accept buttons
          const continueButtons = [
            'text=Continue',
            'text=Accept',
            'text=I Agree',
            'text=Next',
            'text=Finish'
          ];
          
          let clicked = false;
          for (const buttonSelector of continueButtons) {
            const buttonCount = await page.locator(buttonSelector).count();
            if (buttonCount > 0) {
              console.log(`   Clicking ${buttonSelector}...`);
              await page.click(buttonSelector);
              await page.waitForTimeout(2000);
              clicked = true;
              break;
            }
          }
          
          if (!clicked) {
            console.log('   ❌ No continue button found - onboarding may be stuck');
            break;
          }
          
          onboardingStep++;
        }
      } else {
        console.log('   ❌ Continue button not found');
      }
    }
    
    // Now check for navigation
    console.log('\n🧭 Step 3: Checking navigation after onboarding');
    
    const finalPageText = await page.evaluate(() => {
      return document.body.innerText;
    });
    
    console.log('   Final page content preview:');
    console.log('   ' + finalPageText.substring(0, 300) + '...');
    
    // Check for navigation elements
    const bottomNav = await page.locator('div[class*="fixed bottom-0"]').count();
    console.log(`   Bottom navigation found: ${bottomNav > 0 ? '✅' : '❌'}`);
    
    const navButtons = await page.locator('button[class*="flex flex-col items-center justify-center"]').count();
    console.log(`   Navigation buttons found: ${navButtons}`);
    
    // Check for specific tabs
    const discoverTab = await page.locator('text=Discover').count();
    const myBetsTab = await page.locator('text=My Bets').count();
    const createTab = await page.locator('text=Create').count();
    const clubsTab = await page.locator('text=Clubs').count();
    const profileTab = await page.locator('text=Profile').count();
    const userAvatar = await page.locator('div[class*="w-6 h-6 rounded-full"]').count();
    
    console.log(`   Discover tab: ${discoverTab > 0 ? '✅' : '❌'}`);
    console.log(`   My Bets tab: ${myBetsTab > 0 ? '✅' : '❌'}`);
    console.log(`   Create tab: ${createTab > 0 ? '✅' : '❌'}`);
    console.log(`   Clubs tab: ${clubsTab > 0 ? '✅' : '❌'}`);
    console.log(`   Profile tab: ${profileTab > 0 ? '✅' : '❌'}`);
    console.log(`   User avatar: ${userAvatar > 0 ? '✅' : '❌'}`);
    
    // Try to navigate to Profile if navigation is available
    if (navButtons > 0 || userAvatar > 0 || profileTab > 0) {
      console.log('\n👤 Step 4: Testing Profile navigation');
      
      let profileClicked = false;
      
      if (userAvatar > 0) {
        console.log('   Trying to click user avatar...');
        await page.click('div[class*="w-6 h-6 rounded-full"]');
        await page.waitForTimeout(2000);
        profileClicked = true;
      } else if (profileTab > 0) {
        console.log('   Trying to click Profile text...');
        await page.click('text=Profile');
        await page.waitForTimeout(2000);
        profileClicked = true;
      } else if (navButtons >= 5) {
        console.log('   Trying to click last navigation button (Profile)...');
        await page.locator('button[class*="flex flex-col items-center justify-center"]').nth(4).click();
        await page.waitForTimeout(2000);
        profileClicked = true;
      }
      
      if (profileClicked) {
        // Check Profile page elements
        const profileElements = [
          'text=Profile',
          'text=Demo User',
          'text=@demo',
          'text=Edit Profile',
          'text=Sign Out'
        ];
        
        console.log('   Profile page elements:');
        for (const selector of profileElements) {
          const count = await page.locator(selector).count();
          console.log(`     ${selector}: ${count > 0 ? '✅' : '❌'}`);
        }
        
        // Test Edit Profile functionality
        console.log('\n✏️ Step 5: Edit Profile functionality');
        
        const editProfileButton = await page.locator('text=Edit Profile').count();
        if (editProfileButton > 0) {
          console.log('   ✅ Edit Profile button found');
          
          await page.click('text=Edit Profile');
          await page.waitForTimeout(1000);
          
          // Check if edit modal opened
          const editModal = await page.locator('text=Edit Profile').count();
          if (editModal > 0) {
            console.log('   ✅ Edit Profile modal opened');
            
            // Check form fields
            const firstNameInput = await page.locator('input[value="Demo"]').count();
            const lastNameInput = await page.locator('input[value="User"]').count();
            const bioInput = await page.locator('textarea').count();
            const dobInput = await page.locator('input[type="date"]').count();
            
            console.log(`   Form fields: First Name(${firstNameInput}), Last Name(${lastNameInput}), Bio(${bioInput}), DOB(${dobInput})`);
            
            if (firstNameInput > 0 && lastNameInput > 0 && dobInput > 0) {
              console.log('   ✅ All required form fields present');
              
              // Test form submission
              await page.fill('input[value="Demo"]', 'Updated Demo');
              await page.fill('input[value="User"]', 'Updated User');
              if (bioInput > 0) {
                await page.fill('textarea', 'This is my updated bio');
              }
              await page.fill('input[type="date"]', '1990-01-01');
              
              await page.click('button:has-text("Save Changes")');
              await page.waitForTimeout(2000);
              
              // Check for success message
              const successMessage = await page.locator('text=Profile updated successfully').count();
              if (successMessage > 0) {
                console.log('   ✅ Profile updated successfully');
              } else {
                console.log('   ❌ Profile update failed or no success message');
              }
            } else {
              console.log('   ❌ Required form fields missing');
            }
          } else {
            console.log('   ❌ Edit Profile modal not opened');
          }
        } else {
          console.log('   ❌ Edit Profile button not found');
        }
      }
    } else {
      console.log('   ❌ No navigation elements found - cannot test Profile');
    }
    
  } catch (error) {
    console.log('❌ Test error:', error.message);
  } finally {
    await context.close();
    await browser.close();
  }
  
  console.log('\n🎯 Demo login test complete!');
}

testDemoLogin().catch(console.error); 