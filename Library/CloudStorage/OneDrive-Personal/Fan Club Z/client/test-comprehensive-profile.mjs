import { chromium } from '@playwright/test';

async function testComprehensiveProfile() {
  console.log('🎯 Comprehensive Profile & Navigation Test...\n');
  
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Navigate to app
    console.log('📱 Loading app...');
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Login process
    console.log('\n🔐 Step 1: Login process');
    await page.click('button:has-text("Sign In")');
    await page.waitForTimeout(1000);
    
    await page.fill('input[placeholder="Enter your email"]', 'demo@fanclubz.app');
    await page.fill('input[placeholder="Enter your password"]', 'demo123');
    await page.click('button:has-text("Sign In")');
    await page.waitForTimeout(3000);
    
    // Check if login was successful
    const isAuthenticated = await page.evaluate(() => {
      return localStorage.getItem('auth_token') !== null;
    });
    
    if (!isAuthenticated) {
      console.log('❌ Login failed - cannot proceed with Profile tests');
      return;
    }
    
    console.log('✅ Login successful');
    
    // Check navigation structure
    console.log('\n🧭 Step 2: Navigation structure check');
    
    // Wait for page to fully load after login
    await page.waitForTimeout(2000);
    
    // Check for bottom navigation
    const bottomNav = await page.locator('div[class*="fixed bottom-0"]').count();
    console.log(`   Bottom navigation found: ${bottomNav > 0 ? '✅' : '❌'}`);
    
    // Check for navigation buttons
    const navButtons = await page.locator('button[class*="flex flex-col items-center justify-center"]').count();
    console.log(`   Navigation buttons found: ${navButtons}`);
    
    // Check for specific navigation elements
    const discoverTab = await page.locator('text=Discover').count();
    const myBetsTab = await page.locator('text=My Bets').count();
    const createTab = await page.locator('text=Create').count();
    const clubsTab = await page.locator('text=Clubs').count();
    
    console.log(`   Discover tab: ${discoverTab > 0 ? '✅' : '❌'}`);
    console.log(`   My Bets tab: ${myBetsTab > 0 ? '✅' : '❌'}`);
    console.log(`   Create tab: ${createTab > 0 ? '✅' : '❌'}`);
    console.log(`   Clubs tab: ${clubsTab > 0 ? '✅' : '❌'}`);
    
    // Try to find Profile tab (could be avatar or text)
    const profileText = await page.locator('text=Profile').count();
    const userAvatar = await page.locator('div[class*="w-6 h-6 rounded-full"]').count();
    const signInButton = await page.locator('text=Sign In').count();
    
    console.log(`   Profile text: ${profileText > 0 ? '✅' : '❌'}`);
    console.log(`   User avatar: ${userAvatar > 0 ? '✅' : '❌'}`);
    console.log(`   Sign In button: ${signInButton > 0 ? '✅' : '❌'}`);
    
    // Navigate to Profile
    console.log('\n👤 Step 3: Profile navigation');
    
    let profileClicked = false;
    
    // Try clicking user avatar first
    if (userAvatar > 0) {
      console.log('   Trying to click user avatar...');
      await page.click('div[class*="w-6 h-6 rounded-full"]');
      await page.waitForTimeout(2000);
      profileClicked = true;
    }
    // Try clicking Profile text
    else if (profileText > 0) {
      console.log('   Trying to click Profile text...');
      await page.click('text=Profile');
      await page.waitForTimeout(2000);
      profileClicked = true;
    }
    // Try clicking the last navigation button (should be Profile)
    else if (navButtons >= 5) {
      console.log('   Trying to click last navigation button (Profile)...');
      await page.locator('button[class*="flex flex-col items-center justify-center"]').nth(4).click();
      await page.waitForTimeout(2000);
      profileClicked = true;
    }
    // Try clicking Sign In button (should navigate to Profile if authenticated)
    else if (signInButton > 0) {
      console.log('   Trying to click Sign In button (should go to Profile)...');
      await page.click('text=Sign In');
      await page.waitForTimeout(2000);
      profileClicked = true;
    }
    
    if (!profileClicked) {
      console.log('   ❌ Could not find Profile navigation element');
      return;
    }
    
    // Check Profile page elements
    console.log('\n📋 Step 4: Profile page elements check');
    
    const profileElements = [
      { name: 'Profile Header', selector: 'text=Profile' },
      { name: 'User Name', selector: 'text=Demo User' },
      { name: 'Username', selector: 'text=@demo' },
      { name: 'Stats Grid', selector: 'text=Total Bets' },
      { name: 'Wallet Card', selector: 'text=Available Balance' },
      { name: 'Edit Profile Button', selector: 'text=Edit Profile' },
      { name: 'Security Button', selector: 'text=Security' },
      { name: 'Notifications Button', selector: 'text=Notifications' },
      { name: 'Payment Methods Button', selector: 'text=Payment Methods' },
      { name: 'Transaction History Button', selector: 'text=Transaction History' },
      { name: 'Help & Support Button', selector: 'text=Help & Support' },
      { name: 'Sign Out Button', selector: 'text=Sign Out' }
    ];
    
    let foundElements = 0;
    for (const element of profileElements) {
      const isVisible = await page.locator(element.selector).isVisible();
      console.log(`   ${element.name}: ${isVisible ? '✅' : '❌'}`);
      if (isVisible) foundElements++;
    }
    
    console.log(`\n📊 Profile elements found: ${foundElements}/${profileElements.length}`);
    
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
    
    // Test non-functional buttons
    console.log('\n🔧 Step 6: Non-functional buttons test');
    
    const nonFunctionalButtons = [
      { name: 'Security', selector: 'text=Security' },
      { name: 'Notifications', selector: 'text=Notifications' },
      { name: 'Payment Methods', selector: 'text=Payment Methods' },
      { name: 'Transaction History', selector: 'text=Transaction History' },
      { name: 'Help & Support', selector: 'text=Help & Support' }
    ];
    
    for (const button of nonFunctionalButtons) {
      const buttonCount = await page.locator(button.selector).count();
      console.log(`   ${button.name}: ${buttonCount > 0 ? 'Found' : 'Not found'}`);
      
      if (buttonCount > 0) {
        try {
          await page.click(button.selector);
          await page.waitForTimeout(1000);
          console.log(`     Clicked (no action expected)`);
        } catch (error) {
          console.log(`     Click error: ${error.message}`);
        }
      }
    }
    
    // Test wallet card functionality
    console.log('\n💰 Step 7: Wallet card functionality');
    
    const walletCard = await page.locator('text=Tap to manage wallet').count();
    if (walletCard > 0) {
      console.log('   ✅ Wallet card found');
      
      try {
        await page.click('text=Tap to manage wallet');
        await page.waitForTimeout(1000);
        console.log('   Wallet card clicked (no action expected)');
      } catch (error) {
        console.log(`   Wallet card click error: ${error.message}`);
      }
    } else {
      console.log('   ❌ Wallet card not found');
    }
    
    // Test logout functionality
    console.log('\n🚪 Step 8: Logout functionality');
    
    const signOutButton = await page.locator('text=Sign Out').count();
    if (signOutButton > 0) {
      console.log('   ✅ Sign Out button found');
      
      await page.click('text=Sign Out');
      await page.waitForTimeout(2000);
      
      // Check if logged out
      const discoverText = await page.locator('text=Discover').count();
      const signInText = await page.locator('text=Sign In').count();
      
      if (discoverText > 0 && signInText > 0) {
        console.log('   ✅ Logout successful - redirected to discover with Sign In button');
      } else {
        console.log('   ❌ Logout failed - not redirected properly');
      }
    } else {
      console.log('   ❌ Sign Out button not found');
    }
    
  } catch (error) {
    console.log('❌ Test error:', error.message);
  } finally {
    await context.close();
    await browser.close();
  }
  
  console.log('\n🎯 Comprehensive Profile & Navigation test complete!');
}

testComprehensiveProfile().catch(console.error); 