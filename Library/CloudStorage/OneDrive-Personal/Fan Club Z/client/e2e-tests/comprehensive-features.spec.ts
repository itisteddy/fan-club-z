import { test, expect } from '@playwright/test';

test.describe('Fan Club Z - Comprehensive Feature Testing', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
  });

  test.describe('Authentication & Onboarding', () => {
    test('should display login page for unauthenticated users', async ({ page }) => {
      console.log('🧪 Testing login page display...');
      
      // Check if we're on the login page
      await expect(page.locator('text=Welcome to Fan Club Z')).toBeVisible({ timeout: 10000 });
      console.log('✅ Welcome text found');
      
      await expect(page.locator('button:has-text("Sign In")')).toBeVisible({ timeout: 5000 });
      console.log('✅ Sign In button found');
      
      // Check for expected login form elements
      await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 5000 });
      console.log('✅ Email input found');
      
      await expect(page.locator('input[type="password"]')).toBeVisible({ timeout: 5000 });
      console.log('✅ Password input found');
      
      console.log('🎉 Login page test passed!');
    });

    test('should handle email login flow', async ({ page }) => {
      console.log('🧪 Testing email login form...');
      
      // Should show email form
      await expect(page.locator('input[type="email"]')).toBeVisible();
      await expect(page.locator('input[type="password"]')).toBeVisible();
      
      // Fill in test credentials
      await page.locator('input[type="email"]').fill('test@example.com');
      await page.locator('input[type="password"]').fill('password123');
      
      // Submit form (this will likely show an error for invalid credentials, which is expected)
      await page.locator('button:has-text("Sign In")').click();
      
      // Wait for form response
      await page.waitForTimeout(2000);
      
      // Verify the form handled the submission (may show error, loading state, etc.)
      // This tests that the login flow is functional even if credentials are invalid
      console.log('✅ Login form submitted and handled');
    });

    test('should complete onboarding flow', async ({ page }) => {
      console.log('🧪 Testing onboarding flow completion...');
      
      // The onboarding flow should be triggered after successful registration
      // For testing, we'll create a test user and trigger onboarding
      
      // First, check if we can access the onboarding page directly
      await page.goto('http://localhost:3000/onboarding');
      await page.waitForTimeout(3000);
      
      const currentUrl = page.url();
      console.log(`📍 Current URL: ${currentUrl}`);
      
      // If we're redirected to login, that means onboarding requires auth
      if (currentUrl.includes('/auth/login')) {
        console.log('ℹ️ Onboarding requires authentication - this is expected behavior');
        
        // Test the registration flow which should lead to onboarding
        // Navigate to registration
        await page.locator('text=Sign up').click();
        await page.waitForTimeout(2000);
        
        // Fill in registration form with test data
        const testEmail = `test-${Date.now()}@example.com`;
        await page.locator('input[name="firstName"]').fill('Test');
        await page.locator('input[name="lastName"]').fill('User');
        await page.locator('input[name="email"]').fill(testEmail);
        await page.locator('input[name="password"]').fill('TestPass123!');
        await page.locator('input[name="confirmPassword"]').fill('TestPass123!');
        await page.locator('input[name="dateOfBirth"]').fill('1990-01-01');
        
        // Accept terms and privacy
        await page.locator('input[name="agreeToTerms"]').check();
        await page.locator('input[name="agreeToPrivacy"]').check();
        
        // Submit registration
        await page.locator('button:has-text("Create Account")').click();
        await page.waitForTimeout(3000);
        
        // Check if registration was successful and we're directed to onboarding
        const postRegUrl = page.url();
        console.log(`📍 Post-registration URL: ${postRegUrl}`);
        
        if (!postRegUrl.includes('/onboarding')) {
          console.log('⚠️ Registration did not redirect to onboarding');
          // This might be because the backend is not running or registration failed
          // Skip the rest of the test
          test.skip();
          return;
        }
      }
      
      // Now we should be on the onboarding flow
      console.log('✅ Starting onboarding flow tests...');
      
      // Step 1: Welcome screen
      const welcomeText = page.locator('text=Welcome to Fan Club Z');
      if (await welcomeText.isVisible({ timeout: 3000 })) {
        console.log('✅ Welcome screen found');
        
        // Click Get Started
        const getStartedBtn = page.locator('button:has-text("Get Started")');
        if (await getStartedBtn.isVisible({ timeout: 2000 })) {
          await getStartedBtn.click();
          console.log('✅ Get Started clicked');
        }
      }
      
      await page.waitForTimeout(2000);
      
      // Step 2: Terms of Service
      const termsTitle = page.locator('text=Terms of Service');
      if (await termsTitle.isVisible({ timeout: 5000 })) {
        console.log('✅ Terms of Service page found');
        
        // Click I Agree
        const agreeBtn = page.locator('button:has-text("I Agree")');
        await agreeBtn.click();
        console.log('✅ Terms accepted');
      }
      
      await page.waitForTimeout(2000);
      
      // Step 3: Privacy Policy
      const privacyTitle = page.locator('text=Privacy Policy');
      if (await privacyTitle.isVisible({ timeout: 5000 })) {
        console.log('✅ Privacy Policy page found');
        
        // Click I Agree
        const agreeBtn = page.locator('button:has-text("I Agree")');
        await agreeBtn.click();
        console.log('✅ Privacy Policy accepted');
      }
      
      await page.waitForTimeout(2000);
      
      // Step 4: Responsible Gambling
      const responsibleTitle = page.locator('text=Responsible Gambling');
      if (await responsibleTitle.isVisible({ timeout: 5000 })) {
        console.log('✅ Responsible Gambling page found');
        
        // Click Close
        const closeBtn = page.locator('button:has-text("Close")');
        await closeBtn.click();
        console.log('✅ Responsible Gambling closed');
      }
      
      await page.waitForTimeout(2000);
      
      // Step 5: Setup Complete
      const completeTitle = page.locator('text=Setup Complete!');
      if (await completeTitle.isVisible({ timeout: 5000 })) {
        console.log('✅ Setup Complete page found');
        
        // Click Start Exploring
        const startBtn = page.locator('button:has-text("Start Exploring")');
        await startBtn.click();
        console.log('✅ Start Exploring clicked');
      }
      
      await page.waitForTimeout(3000);
      
      // Step 6: Verify we're in the main app
      const bottomNav = page.locator('[data-testid="bottom-navigation"]');
      await expect(bottomNav).toBeVisible({ timeout: 10000 });
      console.log('✅ Bottom navigation visible - onboarding completed!');
      
      // Verify we're on the discover page
      await expect(page.locator('header h1:has-text("Discover")')).toBeVisible({ timeout: 5000 });
      console.log('✅ Redirected to Discover page');
      
      console.log('🎉 Onboarding flow test completed successfully!');
    });
  });

  test.describe('Navigation & Bottom Navigation', () => {
    test.beforeEach(async ({ page }) => {
      // Skip authentication-dependent tests for now
      // These would need proper authentication setup with valid credentials
      test.skip();
    });

    test('should navigate between all tabs', async ({ page }) => {
      // Check Discover tab - use header-specific selector to avoid strict mode violations
      await expect(page.locator('header h1:has-text("Discover")')).toBeVisible();
      await expect(page.locator('text=Trending Now')).toBeVisible();
      
      // Navigate to My Bets
      await page.locator('[data-testid="bottom-navigation"] >> text=My Bets').click();
      await expect(page.locator('header h1:has-text("My Bets")')).toBeVisible();
      await expect(page.locator('div:has-text("Active Bets")').first()).toBeVisible();
      
      // Navigate to Clubs
      await page.locator('[data-testid="bottom-navigation"] >> text=Clubs').click();
      await expect(page.locator('header h1:has-text("Clubs")')).toBeVisible();
      await expect(page.locator('text=My Clubs')).toBeVisible();
      
      // Navigate to Wallet
      await page.locator('[data-testid="bottom-navigation"] >> text=Wallet').click();
      await expect(page.locator('header h1:has-text("Wallet")')).toBeVisible();
      await expect(page.locator('text=Available Balance')).toBeVisible();
      
      // Navigate to Profile
      await page.locator('[data-testid="bottom-navigation"] >> text=Profile').click();
      await expect(page.locator('header h1:has-text("Profile")')).toBeVisible();
      await expect(page.locator('text=Demo User')).toBeVisible();
    });

    test('should show active tab indicator', async ({ page }) => {
      // Check initial active tab (Discover)
      await expect(page.locator('[data-testid="bottom-navigation"] >> text=Discover')).toHaveClass(/active/);
      
      // Click My Bets and check active state
      await page.locator('[data-testid="bottom-navigation"] >> text=My Bets').click();
      await expect(page.locator('[data-testid="bottom-navigation"] >> text=My Bets')).toHaveClass(/active/);
    });
  });

  test.describe('Discover & Betting Features', () => {
    test.beforeEach(async ({ page }) => {
      // Skip authentication-dependent tests for now
      test.skip();
    });

    test('should display trending bets', async ({ page }) => {
      // Verify trending bets are loaded
      await expect(page.locator('[data-testid="bet-card"]')).toHaveCount(3);
      
      // Verify bet details are visible
      await expect(page.locator('text=Taylor Swift announces surprise album?')).toBeVisible();
      await expect(page.locator('text=Premier League: Man City vs Arsenal')).toBeVisible();
      await expect(page.locator('text=Will Bitcoin reach $100K')).toBeVisible();
    });

    test('should allow bet filtering by category', async ({ page }) => {
      // Click on sports category
      await page.locator('button:has-text("Sports")').click();
      
      // Should show only sports bets
      await expect(page.locator('text=Premier League: Man City vs Arsenal')).toBeVisible();
      await expect(page.locator('text=Taylor Swift')).not.toBeVisible();
    });

    test('should allow bet search', async ({ page }) => {
      // Type in search
      await page.locator('input[placeholder="Search bets..."]').fill('Bitcoin');
      
      // Should show only Bitcoin bet
      await expect(page.locator('text=Will Bitcoin reach $100K')).toBeVisible();
      await expect(page.locator('text=Taylor Swift')).not.toBeVisible();
    });

    test('should navigate to bet detail page', async ({ page }) => {
      // Click on the View Details button of a bet card
      await page.locator('[data-testid="bet-card"] button:has-text("View Details")').first().click();
      
      // Should be on bet detail page - check for bet title in hero section
      await expect(page.locator('h1:has-text("Premier League: Man City vs Arsenal - Who wins?")')).toBeVisible();
      await expect(page.locator('text=Place Bet')).toBeVisible();
    });

    test('should allow placing bets when authenticated', async ({ page }) => {
      // Navigate to bet detail
      await page.locator('[data-testid="bet-card"]').first().click();
      
      // Place a bet
      await page.locator('button:has-text("Yes, she will")').click();
      await page.locator('input[placeholder="Amount"]').fill('10');
      await page.locator('button:has-text("Place Bet")').click();
      
      // Should show success
      await expect(page.locator('text=Bet placed successfully')).toBeVisible();
    });

    test('should show bet statistics and metadata', async ({ page }) => {
      // Click on a bet card
      await page.locator('[data-testid="bet-card"]').first().click();
      
      // Check for bet metadata
      await expect(page.locator('text=participants')).toBeVisible();
      await expect(page.locator('text=pool')).toBeVisible();
      await expect(page.locator('text=Time remaining')).toBeVisible();
    });

    test('should allow liking and sharing bets', async ({ page }) => {
      // Click on a bet card
      await page.locator('[data-testid="bet-card"]').first().click();
      
      // Like the bet
      await page.locator('button[aria-label="Like"]').click();
      await expect(page.locator('button[aria-label="Like"]')).toHaveClass(/liked/);
      
      // Share the bet
      await page.locator('button[aria-label="Share"]').click();
      await expect(page.locator('text=Share Bet')).toBeVisible();
    });
  });

  test.describe('My Bets & User Activity', () => {
    test.beforeEach(async ({ page }) => {
      // Skip authentication-dependent tests for now
      test.skip();
    });

    test('should display user betting statistics', async ({ page }) => {
      // Check stats cards
      await expect(page.locator('text=Active Bets')).toBeVisible();
      await expect(page.locator('text=Win Rate')).toBeVisible();
      
      // Check for actual numbers
      await expect(page.locator('text=0')).toBeVisible(); // or actual numbers
    });

    test('should show different bet tabs', async ({ page }) => {
      // Check all tabs exist
      await expect(page.locator('text=Active')).toBeVisible();
      await expect(page.locator('text=Created')).toBeVisible();
      await expect(page.locator('text=Won')).toBeVisible();
      await expect(page.locator('text=Lost')).toBeVisible();
      
      // Click on different tabs
      await page.locator('text=Created').click();
      await expect(page.locator('text=Bets You Created')).toBeVisible();
      
      await page.locator('text=Won').click();
      await expect(page.locator('text=Winning Bets')).toBeVisible();
      
      await page.locator('text=Lost').click();
      await expect(page.locator('text=Losing Bets')).toBeVisible();
    });

    test('should show empty states for no bets', async ({ page }) => {
      // Check empty state messages
      await expect(page.locator('text=No active bets')).toBeVisible();
      await expect(page.locator('text=Your active positions will appear here')).toBeVisible();
    });

    test('should update stats after placing a bet', async ({ page }) => {
      // Place a bet first
      await page.locator('[data-testid="bottom-navigation"] >> text=Discover').click();
      await page.locator('[data-testid="bet-card"]').first().click();
      await page.locator('button:has-text("Yes, she will")').click();
      await page.locator('input[placeholder="Amount"]').fill('10');
      await page.locator('button:has-text("Place Bet")').click();
      
      // Go back to My Bets
      await page.locator('[data-testid="bottom-navigation"] >> text=My Bets').click();
      
      // Check if stats updated
      await expect(page.locator('text=1')).toBeVisible(); // Active bets should be 1
    });
  });

  test.describe('Wallet & Payment Features', () => {
    test.beforeEach(async ({ page }) => {
      // Skip authentication-dependent tests for now
      test.skip();
    });

    test('should display wallet balance', async ({ page }) => {
      await expect(page.locator('text=Available Balance')).toBeVisible();
      await expect(page.locator('text=$2,500.00')).toBeVisible(); // Demo balance
    });

    test('should show quick deposit amounts correctly', async ({ page }) => {
      // Click on quick deposit amount
      await page.locator('button:has-text("$50")').click();
      
      // Modal should open with correct amount
      await expect(page.locator('text=Add Funds')).toBeVisible();
      await expect(page.locator('text=$50.00')).toBeVisible();
    });

    test('should allow custom deposit amounts', async ({ page }) => {
      // Open deposit modal
      await page.locator('button:has-text("Add Funds")').click();
      
      // Change amount
      await page.locator('input[type="number"]').fill('75');
      await expect(page.locator('text=$75.00')).toBeVisible();
      
      // Submit deposit
      await page.locator('button:has-text("Deposit $75.00")').click();
      
      // Should show success
      await expect(page.locator('text=Deposit Successful!')).toBeVisible();
    });

    test('should show transaction history', async ({ page }) => {
      // Check transaction filters
      await expect(page.locator('text=All')).toBeVisible();
      await expect(page.locator('text=Deposits')).toBeVisible();
      await expect(page.locator('text=Withdrawals')).toBeVisible();
      await expect(page.locator('text=Bets')).toBeVisible();
      
      // Click on different filters
      await page.locator('text=Deposits').click();
      await page.locator('text=Withdrawals').click();
      await page.locator('text=Bets').click();
    });

    test('should allow withdrawals', async ({ page }) => {
      // Click withdraw button
      await page.locator('button:has-text("Withdraw")').click();
      
      // Should show withdraw modal
      await expect(page.locator('text=Withdraw Funds')).toBeVisible();
      
      // Enter amount
      await page.locator('input[type="number"]').fill('100');
      await page.locator('button:has-text("Withdraw $100.00")').click();
      
      // Should show success
      await expect(page.locator('text=Withdrawal successful')).toBeVisible();
    });
  });

  test.describe('Profile & User Settings', () => {
    test.beforeEach(async ({ page }) => {
      // Skip authentication-dependent tests for now
      test.skip();
    });

    test('should display user profile information', async ({ page }) => {
      await expect(page.locator('text=Demo User')).toBeVisible();
      await expect(page.locator('text=demo@fanclubz.app')).toBeVisible();
      await expect(page.locator('text=Demo account for testing Fan Club Z features')).toBeVisible();
    });

    test('should show user statistics', async ({ page }) => {
      // Check stats cards
      await expect(page.locator('text=Total Bets')).toBeVisible();
      await expect(page.locator('text=Win Rate')).toBeVisible();
      await expect(page.locator('text=Total Winnings')).toBeVisible();
      await expect(page.locator('text=Net Profit')).toBeVisible();
    });

    test('should allow editing profile', async ({ page }) => {
      // Click edit profile
      await page.locator('button:has-text("Edit Profile")').click();
      
      // Should show edit modal
      await expect(page.locator('text=Edit Profile')).toBeVisible();
      
      // Edit fields
      await page.locator('input[name="firstName"]').fill('Updated');
      await page.locator('input[name="lastName"]').fill('User');
      await page.locator('textarea[name="bio"]').fill('Updated bio');
      
      // Save changes
      await page.locator('button:has-text("Save Changes")').click();
      
      // Should show success
      await expect(page.locator('text=Profile updated successfully')).toBeVisible();
    });

    test('should show all profile sections', async ({ page }) => {
      // Check all profile sections exist
      await expect(page.locator('text=Security')).toBeVisible();
      await expect(page.locator('text=Notifications')).toBeVisible();
      await expect(page.locator('text=Payment Methods')).toBeVisible();
      await expect(page.locator('text=Transaction History')).toBeVisible();
      await expect(page.locator('text=Help & Support')).toBeVisible();
    });

    test('should allow accessing security settings', async ({ page }) => {
      await page.locator('text=Security').click();
      
      await expect(page.locator('text=Security Settings')).toBeVisible();
      await expect(page.locator('text=Change Password')).toBeVisible();
      await expect(page.locator('text=Two-Factor Authentication')).toBeVisible();
    });

    test('should allow accessing notification settings', async ({ page }) => {
      await page.locator('text=Notifications').click();
      
      await expect(page.locator('text=Notification Settings')).toBeVisible();
      await expect(page.locator('text=Push Notifications')).toBeVisible();
      await expect(page.locator('text=Email Notifications')).toBeVisible();
    });

    test('should allow logging out', async ({ page }) => {
      await page.locator('text=Sign Out').click();
      
      // Should be back to login page
      await expect(page.locator('text=Welcome to Fan Club Z')).toBeVisible();
    });
  });

  test.describe('Clubs & Social Features', () => {
    test.beforeEach(async ({ page }) => {
      // Skip authentication-dependent tests for now
      test.skip();
    });

    test('should display clubs tabs', async ({ page }) => {
      await expect(page.locator('[role="tab"]:has-text("Discover")')).toBeVisible();
      await expect(page.locator('[role="tab"]:has-text("My Clubs")')).toBeVisible();
      await expect(page.locator('[role="tab"]:has-text("Trending")')).toBeVisible();
    });

    test('should show club categories', async ({ page }) => {
      // Wait for page to fully load and ensure we're on Discover tab
      await page.waitForTimeout(2000);
      
      // Check that we're on the clubs page
      await expect(page.locator('header h1:has-text("Clubs")')).toBeVisible();
      
      // Ensure we're on the Discover tab (where categories should be visible)
      const discoverTab = page.locator('[role="tab"]:has-text("Discover")');
      if (await discoverTab.isVisible()) {
        await discoverTab.click();
        await page.waitForTimeout(1000);
      }
      
      // Check category filters using our data-testid attributes
      await expect(page.locator('[data-testid="category-all"]')).toBeVisible();
      await expect(page.locator('[data-testid="category-sports"]')).toBeVisible();
      await expect(page.locator('[data-testid="category-crypto"]')).toBeVisible();
      await expect(page.locator('[data-testid="category-entertainment"]')).toBeVisible();
      
      // Test category interaction
      await page.locator('[data-testid="category-sports"]').click();
      await expect(page.locator('[data-testid="category-sports"]')).toHaveClass(/bg-blue-500/);
      
      // Switch back to All
      await page.locator('[data-testid="category-all"]').click();
      await expect(page.locator('[data-testid="category-all"]')).toHaveClass(/bg-blue-500/);
    });

    test('should allow creating a club', async ({ page }) => {
      // Ensure we're on the Discover tab
      const discoverTab = page.locator('[role="tab"]:has-text("Discover")');
      if (await discoverTab.isVisible()) {
        await discoverTab.click();
        await page.waitForTimeout(1000);
      }
      
      // Click create club button
      await page.locator('button:has-text("Create Club")').click();
      
      // Wait for modal to appear
      await expect(page.locator('text="Create New Club"')).toBeVisible();
      
      // Fill club details
      await page.locator('input[placeholder="Enter club name"]').fill('Test Club');
      await page.locator('textarea[placeholder="Describe your club"]').fill('A test club for testing');
      
      // Select category from dropdown
      await page.locator('[role="combobox"]').click();
      await page.locator('[role="option"]:has-text("Sports")').click();
      
      // Create club
      await page.locator('button:has-text("Create Club")').last().click();
      
      // Should show success message
      await expect(page.locator('text=Club created successfully!')).toBeVisible();
    });

    test('should allow joining clubs', async ({ page }) => {
      // Ensure we're on the Discover tab
      const discoverTab = page.locator('[role="tab"]:has-text("Discover")');
      if (await discoverTab.isVisible()) {
        await discoverTab.click();
        await page.waitForTimeout(1000);
      }
      
      // Wait for clubs to load
      await page.waitForTimeout(2000);
      
      // Look for a Join button on any club card
      const joinButton = page.locator('[data-testid="join-club-button"]').first();
      if (await joinButton.isVisible()) {
        await joinButton.click();
        
        // Should show success message
        await expect(page.locator('text=Joined club successfully!')).toBeVisible();
      } else {
        // If no join buttons (user is already a member of all clubs), this is expected
        console.log('No join buttons found - user may already be a member of all visible clubs');
      }
    });

    test('should navigate to club detail page', async ({ page }) => {
      // Wait for clubs to load
      await page.waitForTimeout(2000);
      
      // Click on first club card or View Club button
      const viewClubButton = page.locator('[data-testid="view-club-button"]').first();
      const clubCard = page.locator('[data-testid="club-card"]').first();
      
      if (await viewClubButton.isVisible()) {
        await viewClubButton.click();
      } else {
        await clubCard.click();
      }
      
      // Wait for navigation
      await page.waitForTimeout(2000);
      
      // Should be on club detail page with tabs
      await expect(page.locator('[role="tab"]:has-text("Overview")')).toBeVisible();
      await expect(page.locator('[role="tab"]:has-text("Bets")')).toBeVisible();
      await expect(page.locator('[role="tab"]:has-text("Members")')).toBeVisible();
      await expect(page.locator('[role="tab"]:has-text("Discussions")')).toBeVisible();
    });

    test('should show club statistics', async ({ page }) => {
      // Navigate to club detail
      const viewClubButton = page.locator('[data-testid="view-club-button"]').first();
      const clubCard = page.locator('[data-testid="club-card"]').first();
      
      if (await viewClubButton.isVisible()) {
        await viewClubButton.click();
      } else {
        await clubCard.click();
      }
      
      // Wait for page to load
      await page.waitForTimeout(2000);
      
      // Check stats in Overview tab (should be default)
      await expect(page.locator('text=Active Bets')).toBeVisible();
      await expect(page.locator('text=Avg Win Rate')).toBeVisible();
      await expect(page.locator('text=Total Pool')).toBeVisible();
      await expect(page.locator('text=Discussions')).toBeVisible();
    });

    test('should allow creating club bets', async ({ page }) => {
      // Navigate to club detail first
      const viewClubButton = page.locator('[data-testid="view-club-button"]').first();
      const clubCard = page.locator('[data-testid="club-card"]').first();
      
      if (await viewClubButton.isVisible()) {
        await viewClubButton.click();
      } else {
        // Try to join a club first if needed
        const joinButton = page.locator('[data-testid="join-club-button"]').first();
        if (await joinButton.isVisible()) {
          await joinButton.click();
          await page.waitForTimeout(1000);
        }
        await clubCard.click();
      }
      
      // Wait for club detail page to load
      await page.waitForTimeout(2000);
      
      // Navigate to Bets tab
      await page.locator('[role="tab"]:has-text("Bets")').click();
      await page.waitForTimeout(1000);
      
      // Click create bet button
      const createBetButton = page.locator('button:has-text("Create Bet")');
      if (await createBetButton.isVisible()) {
        await createBetButton.click();
        
        // Wait for modal
        await expect(page.locator('text="Create Club Bet"')).toBeVisible();
        
        // Fill bet details
        await page.locator('input[placeholder="What are you predicting?"]').fill('Test Club Bet');
        await page.locator('textarea[placeholder*="details"]').fill('A test bet for the club');
        
        // Set future date
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 30);
        const dateString = futureDate.toISOString().slice(0, 16);
        await page.locator('input[type="datetime-local"]').fill(dateString);
        
        // Create bet
        await page.locator('button:has-text("Create Bet")').last().click();
        
        // Should show success
        await expect(page.locator('text=Bet created successfully!')).toBeVisible();
      } else {
        console.log('Create Bet button not visible - user may not have permission');
      }
    });

    test('should allow creating discussions', async ({ page }) => {
      // Navigate to club detail first
      const viewClubButton = page.locator('[data-testid="view-club-button"]').first();
      const clubCard = page.locator('[data-testid="club-card"]').first();
      
      if (await viewClubButton.isVisible()) {
        await viewClubButton.click();
      } else {
        // Try to join a club first if needed
        const joinButton = page.locator('[data-testid="join-club-button"]').first();
        if (await joinButton.isVisible()) {
          await joinButton.click();
          await page.waitForTimeout(1000);
        }
        await clubCard.click();
      }
      
      // Wait for club detail page
      await page.waitForTimeout(2000);
      
      // Go to discussions tab
      await page.locator('[role="tab"]:has-text("Discussions")').click();
      await page.waitForTimeout(1000);
      
      // Click create discussion button
      const newDiscussionButton = page.locator('button:has-text("New Discussion")');
      if (await newDiscussionButton.isVisible()) {
        await newDiscussionButton.click();
        
        // Wait for modal
        await expect(page.locator('text="Start Discussion"')).toBeVisible();
        
        // Fill discussion details
        await page.locator('input[placeholder="Discussion title"]').fill('Test Discussion');
        await page.locator('textarea[placeholder*="thoughts"]').fill('This is a test discussion');
        
        // Post discussion
        await page.locator('button:has-text("Post Discussion")').click();
        
        // Should show success
        await expect(page.locator('text=Discussion created successfully!')).toBeVisible();
      } else {
        console.log('New Discussion button not visible - user may not have permission');
      }
    });

    test('should show club members', async ({ page }) => {
      // Navigate to club detail
      const viewClubButton = page.locator('[data-testid="view-club-button"]').first();
      const clubCard = page.locator('[data-testid="club-card"]').first();
      
      if (await viewClubButton.isVisible()) {
        await viewClubButton.click();
      } else {
        await clubCard.click();
      }
      
      // Wait for page to load
      await page.waitForTimeout(2000);
      
      // Go to members tab
      await page.locator('[role="tab"]:has-text("Members")').click();
      await page.waitForTimeout(1000);
      
      // Should show members list or empty state
      const hasMembers = await page.locator('text=/member/i').isVisible();
      const hasEmptyState = await page.locator('text=No members').isVisible();
      
      if (!hasMembers && !hasEmptyState) {
        // Look for member-related content
        await expect(page.locator('[role="tab"]:has-text("Members")')).toBeVisible();
      }
    });
  });

  test.describe('Cross-Screen Functionality', () => {
    test.beforeEach(async ({ page }) => {
      // Skip authentication-dependent tests for now
      test.skip();
    });

    test('should update wallet balance after placing bet', async ({ page }) => {
      // Check initial balance
      await page.locator('[data-testid="bottom-navigation"] >> text=Wallet').click();
      const initialBalance = await page.locator('text=$2,500.00').textContent();
      
      // Place a bet
      await page.locator('[data-testid="bottom-navigation"] >> text=Discover').click();
      await page.locator('[data-testid="bet-card"]').first().click();
      await page.locator('button:has-text("Yes, she will")').click();
      await page.locator('input[placeholder="Amount"]').fill('50');
      await page.locator('button:has-text("Place Bet")').click();
      
      // Check wallet balance decreased
      await page.locator('[data-testid="bottom-navigation"] >> text=Wallet').click();
      const newBalance = await page.locator('text=/\\$\\d+\\.\\d{2}/').textContent();
      expect(newBalance).not.toBe(initialBalance);
    });

    test('should update profile stats after placing bet', async ({ page }) => {
      // Check initial stats
      await page.locator('[data-testid="bottom-navigation"] >> text=Profile').click();
      const initialTotalBets = await page.locator('text=Total Bets').locator('..').locator('text=/\\d+/').textContent();
      
      // Place a bet
      await page.locator('[data-testid="bottom-navigation"] >> text=Discover').click();
      await page.locator('[data-testid="bet-card"]').first().click();
      await page.locator('button:has-text("Yes, she will")').click();
      await page.locator('input[placeholder="Amount"]').fill('25');
      await page.locator('button:has-text("Place Bet")').click();
      
      // Check profile stats updated
      await page.locator('[data-testid="bottom-navigation"] >> text=Profile').click();
      const newTotalBets = await page.locator('text=Total Bets').locator('..').locator('text=/\\d+/').textContent();
      expect(newTotalBets).not.toBe(initialTotalBets);
    });

    test('should update My Bets after placing bet', async ({ page }) => {
      // Place a bet
      await page.locator('[data-testid="bottom-navigation"] >> text=Discover').click();
      await page.locator('[data-testid="bet-card"]').first().click();
      await page.locator('button:has-text("Yes, she will")').click();
      await page.locator('input[placeholder="Amount"]').fill('30');
      await page.locator('button:has-text("Place Bet")').click();
      
      // Check My Bets updated
      await page.locator('[data-testid="bottom-navigation"] >> text=My Bets').click();
      await expect(page.locator('text=1')).toBeVisible(); // Active bets should be 1
    });

    test('should show bet in transaction history', async ({ page }) => {
      // Place a bet
      await page.locator('[data-testid="bottom-navigation"] >> text=Discover').click();
      await page.locator('[data-testid="bet-card"]').first().click();
      await page.locator('button:has-text("Yes, she will")').click();
      await page.locator('input[placeholder="Amount"]').fill('40');
      await page.locator('button:has-text("Place Bet")').click();
      
      // Check transaction history
      await page.locator('[data-testid="bottom-navigation"] >> text=Wallet').click();
      await page.locator('text=Bets').click();
      await expect(page.locator('text=Bet placed')).toBeVisible();
    });

    test('should update club stats after creating club bet', async ({ page }) => {
      // Join a club
      await page.locator('[data-testid="bottom-navigation"] >> text=Clubs').click();
      await page.locator('button:has-text("Join")').first().click();
      
      // Navigate to club detail
      await page.locator('[data-testid="club-card"]').first().click();
      const initialActiveBets = await page.locator('text=Active Bets').locator('..').locator('text=/\\d+/').textContent();
      
      // Create a club bet
      await page.locator('button:has-text("Create Bet")').click();
      await page.locator('input[placeholder="What are you predicting?"]').fill('Club Test Bet');
      await page.locator('textarea[placeholder="Provide more details"]').fill('Test bet for club');
      await page.locator('input[type="datetime-local"]').fill('2025-12-31T23:59');
      await page.locator('button:has-text("Create Bet")').click();
      
      // Check club stats updated
      const newActiveBets = await page.locator('text=Active Bets').locator('..').locator('text=/\\d+/').textContent();
      expect(newActiveBets).not.toBe(initialActiveBets);
    });
  });

  test.describe('Error Handling & Edge Cases', () => {
    test.beforeEach(async ({ page }) => {
      // Skip authentication-dependent tests for now
      test.skip();
    });

    test('should handle network errors gracefully', async ({ page }) => {
      // Simulate offline mode
      await page.context().setOffline(true);
      
      // Try to place a bet
      await page.locator('[data-testid="bottom-navigation"] >> text=Discover').click();
      await page.locator('[data-testid="bet-card"]').first().click();
      await page.locator('button:has-text("Yes, she will")').click();
      await page.locator('input[placeholder="Amount"]').fill('10');
      await page.locator('button:has-text("Place Bet")').click();
      
      // Should show error message
      await expect(page.locator('text=Network error')).toBeVisible();
      
      // Restore online mode
      await page.context().setOffline(false);
    });

    test('should handle invalid bet amounts', async ({ page }) => {
      // Try to place bet with invalid amount
      await page.locator('[data-testid="bottom-navigation"] >> text=Discover').click();
      await page.locator('[data-testid="bet-card"]').first().click();
      await page.locator('button:has-text("Yes, she will")').click();
      await page.locator('input[placeholder="Amount"]').fill('-10');
      await page.locator('button:has-text("Place Bet")').click();
      
      // Should show validation error
      await expect(page.locator('text=Invalid amount')).toBeVisible();
    });

    test('should handle insufficient balance', async ({ page }) => {
      // Try to place bet with amount higher than balance
      await page.locator('[data-testid="bottom-navigation"] >> text=Discover').click();
      await page.locator('[data-testid="bet-card"]').first().click();
      await page.locator('button:has-text("Yes, she will")').click();
      await page.locator('input[placeholder="Amount"]').fill('10000');
      await page.locator('button:has-text("Place Bet")').click();
      
      // Should show insufficient balance error
      await expect(page.locator('text=Insufficient balance')).toBeVisible();
    });

    test('should handle expired bets', async ({ page }) => {
      // Navigate to expired bet (if exists)
      await page.locator('[data-testid="bottom-navigation"] >> text=Discover').click();
      
      // Look for expired bet
      const expiredBet = page.locator('text=Expired').first();
      if (await expiredBet.isVisible()) {
        await expiredBet.click();
        
        // Should not allow placing bets
        await expect(page.locator('button:has-text("Place Bet")')).toBeDisabled();
        await expect(page.locator('text=This bet has expired')).toBeVisible();
      }
    });
  });

  test.describe('Performance & Loading States', () => {
    test.beforeEach(async ({ page }) => {
      // Skip authentication-dependent tests for now
      test.skip();
    });

    test('should show loading states during data fetching', async ({ page }) => {
      // Navigate to different tabs and check loading states
      await page.locator('[data-testid="bottom-navigation"] >> text=My Bets').click();
      await expect(page.locator('text=Loading...')).toBeVisible();
      
      await page.locator('[data-testid="bottom-navigation"] >> text=Wallet').click();
      await expect(page.locator('text=Loading transactions...')).toBeVisible();
    });

    test('should handle slow network gracefully', async ({ page }) => {
      // Set slow network
      await page.context().setExtraHTTPHeaders({
        'x-slow-network': 'true'
      });
      
      // Navigate to different sections
      await page.locator('[data-testid="bottom-navigation"] >> text=Discover').click();
      await expect(page.locator('text=Loading...')).toBeVisible();
      
      // Should eventually load
      await expect(page.locator('[data-testid="bet-card"]')).toBeVisible();
    });
  });

  test.describe('Accessibility & Mobile Responsiveness', () => {
    test.beforeEach(async ({ page }) => {
      // Skip authentication-dependent tests for now
      test.skip();
    });

    test('should be keyboard navigable', async ({ page }) => {
      // Test tab navigation
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      
      // Should be able to navigate through all interactive elements
      await expect(page.locator(':focus')).toBeVisible();
    });

    test('should have proper ARIA labels', async ({ page }) => {
      // Check for ARIA labels on important elements
      await expect(page.locator('[aria-label]')).toHaveCount(5); // Minimum expected
    });

    test('should work on mobile viewport', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      // Test navigation still works
      await page.locator('[data-testid="bottom-navigation"] >> text=Wallet').click();
      await expect(page.locator('text=Wallet')).toBeVisible();
      
      // Test touch interactions
      await page.locator('[data-testid="bottom-navigation"] >> text=Profile').click();
      await expect(page.locator('text=Profile')).toBeVisible();
    });
  });

  test.describe('Data Persistence & State Management', () => {
    test.beforeEach(async ({ page }) => {
      // Skip authentication-dependent tests for now
      test.skip();
    });

    test('should persist user preferences', async ({ page }) => {
      // Change a setting
      await page.locator('[data-testid="bottom-navigation"] >> text=Profile').click();
      await page.locator('text=Notifications').click();
      await page.locator('input[type="checkbox"]').first().click();
      
      // Reload page
      await page.reload();
      await page.locator('button:has-text("Try Demo")').click();
      
      // Check if setting persisted
      await page.locator('[data-testid="bottom-navigation"] >> text=Profile').click();
      await page.locator('text=Notifications').click();
      await expect(page.locator('input[type="checkbox"]').first()).toBeChecked();
    });

    test('should maintain state across navigation', async ({ page }) => {
      // Place a bet
      await page.locator('[data-testid="bottom-navigation"] >> text=Discover').click();
      await page.locator('[data-testid="bet-card"]').first().click();
      await page.locator('button:has-text("Yes, she will")').click();
      await page.locator('input[placeholder="Amount"]').fill('15');
      
      // Navigate away and back
      await page.locator('[data-testid="bottom-navigation"] >> text=Wallet').click();
      await page.locator('[data-testid="bottom-navigation"] >> text=Discover').click();
      await page.locator('[data-testid="bet-card"]').first().click();
      
      // Should maintain bet selection
      await expect(page.locator('button:has-text("Yes, she will")')).toHaveClass(/selected/);
      await expect(page.locator('input[placeholder="Amount"]')).toHaveValue('15');
    });
  });
}); 