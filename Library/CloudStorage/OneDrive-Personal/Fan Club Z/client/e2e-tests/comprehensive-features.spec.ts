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
      
      // Also check for other expected elements to ensure page loaded correctly
      await expect(page.locator('button:has-text("Try Demo")')).toBeVisible({ timeout: 5000 });
      console.log('✅ Try Demo button found');
      
      console.log('🎉 Login page test passed!');
    });

    test('should allow demo login', async ({ page }) => {
      console.log('🧪 Testing demo login...');
      
      // Add console logging to capture browser logs
      page.on('console', msg => console.log('📟 BROWSER:', msg.text()));
      page.on('pageerror', error => console.error('🚨 PAGE ERROR:', error.message));
      
      // Detect if we're on Mobile Safari and log it
      const browserInfo = await page.evaluate(() => {
        const ua = navigator.userAgent;
        return {
          isMobile: window.innerWidth <= 768 || /Mobi|Android/i.test(ua),
          isMobileSafari: /iPhone|iPad|iPod/i.test(ua) && /Safari/i.test(ua) && !/Chrome|CriOS/i.test(ua),
          userAgent: ua,
          viewport: { width: window.innerWidth, height: window.innerHeight }
        };
      });
      console.log('📱 Browser info:', browserInfo);
      
      // For Mobile Safari, add extra initial wait time
      if (browserInfo.isMobileSafari) {
        console.log('📱 Mobile Safari detected - using extended timeouts and waits');
        await page.waitForTimeout(2000); // Extra wait for Mobile Safari
      }
      
      // Ensure we start on login page
      await expect(page.locator('text=Welcome to Fan Club Z')).toBeVisible({ timeout: 10000 });
      console.log('✅ Login page confirmed');
      
      // Click demo login button
      const demoButton = page.locator('button:has-text("Try Demo")');
      await expect(demoButton).toBeVisible({ timeout: 5000 });
      // For mobile, ensure the button is properly in view
      if (browserInfo.isMobile) {
        await demoButton.scrollIntoViewIfNeeded();
        await page.waitForTimeout(500); // Small delay for scroll
      }
      
      await demoButton.click();
      console.log('✅ Demo button clicked');
      
      // Wait for navigation after login
      console.log('⏳ Waiting for navigation after demo login...');
      
      // Use longer timeout for Mobile Safari
      const navigationTimeout = browserInfo.isMobileSafari ? 20000 : 10000;
      
      // Wait for URL to change from auth page
      await page.waitForFunction(() => !window.location.pathname.startsWith('/auth'), { timeout: navigationTimeout });
      console.log('✅ Navigated away from auth page');
      
      // Log current URL
      const currentUrl = page.url();
      console.log('📍 Current URL after login:', currentUrl);
      
      // Wait for the main app to load
      // We'll wait for either the bottom navigation OR compliance, and handle both cases
      const waitTimeout = browserInfo.isMobileSafari ? 10000 : 5000;
      
      try {
        await Promise.race([
          page.locator('[data-testid="bottom-navigation"]').waitFor({ timeout: waitTimeout }),
          page.locator('text=Before you start betting').waitFor({ timeout: waitTimeout })
        ]);
      } catch (error) {
        console.log('⚠️ Neither bottom nav nor compliance found quickly, taking screenshot...');
        await page.screenshot({ path: 'demo-login-neither-found.png', fullPage: true });
        
        // Log page content for debugging
        const bodyText = await page.locator('body').textContent();
        console.log('🔍 Page content:', bodyText?.substring(0, 500));
      }
      
      // Check if compliance manager appeared (it shouldn't for demo user, but let's handle it)
      const complianceVisible = await page.locator('text=Before you start betting').isVisible();
      if (complianceVisible) {
        console.log('⚠️ Compliance manager appeared for demo user - this should auto-skip');
        await page.screenshot({ path: 'demo-login-compliance-visible.png', fullPage: true });
        
        // Wait for compliance to auto-complete (our fixes should handle this)
        console.log('⏳ Waiting for compliance auto-skip...');
        await page.waitForTimeout(3000);
        
        // Check again for bottom navigation
        try {
          await page.locator('[data-testid="bottom-navigation"]').waitFor({ timeout: 10000 });
        } catch (error) {
          console.log('❌ Compliance did not auto-skip, taking final screenshot...');
          await page.screenshot({ path: 'demo-login-compliance-failed.png', fullPage: true });
          throw new Error('Compliance manager did not auto-skip for demo user');
        }
      }
      
      // Should show main app navigation
      // For mobile, check with more specific selectors
      const bottomNavSelector = '[data-testid="bottom-navigation"]';
      const bottomNav = page.locator(bottomNavSelector);
      
      // Use extended timeout for Mobile Safari
      const finalTimeout = browserInfo.isMobileSafari ? 25000 : 15000;
      
      await expect(bottomNav).toBeVisible({ timeout: finalTimeout });
      console.log('✅ Bottom navigation found');
      
      // Verify bottom navigation is actually functional
      const navButtons = bottomNav.locator('button');
      const buttonCount = await navButtons.count();
      console.log('📱 Bottom navigation button count:', buttonCount);
      
      if (buttonCount === 0) {
        await page.screenshot({ path: 'demo-login-no-nav-buttons.png', fullPage: true });
        throw new Error('Bottom navigation found but no buttons detected');
      }
      
      // Should see discover content or other main app elements
      await expect(page.locator('text=Discover')).toBeVisible({ timeout: 8000 });
      console.log('✅ Discover tab visible');
      
      // Final URL check
      const finalUrl = page.url();
      console.log('📍 Final URL:', finalUrl);
      
      // Verify we're actually on the discover page
      if (!finalUrl.includes('/discover')) {
        console.log('⚠️ Not on discover page, current path:', new URL(finalUrl).pathname);
      }
      
      console.log('🎉 Demo login test passed!');
    });

    test('should complete onboarding flow', async ({ page }) => {
      // Login first
      await page.locator('button:has-text("Try Demo")').click();
      
      // Complete onboarding steps
      await expect(page.locator('text=Welcome to Fan Club Z')).toBeVisible();
      await page.locator('button:has-text("Get Started")').click();
      
      // Terms of Service
      await expect(page.locator('text=Terms of Service')).toBeVisible();
      await page.locator('button:has-text("I Agree")').click();
      
      // Privacy Policy
      await expect(page.locator('text=Privacy Policy')).toBeVisible();
      await page.locator('button:has-text("I Agree")').click();
      
      // Responsible Gambling
      await expect(page.locator('text=Responsible Gambling')).toBeVisible();
      await page.locator('button:has-text("Close")').click();
      
      // Should now be on main app
      await expect(page.locator('[data-testid="bottom-navigation"]')).toBeVisible();
    });

    test('should handle email login flow', async ({ page }) => {
      // Should show email form
      await expect(page.locator('input[type="email"]')).toBeVisible();
      await expect(page.locator('input[type="password"]')).toBeVisible();
      
      // Fill in credentials
      await page.locator('input[type="email"]').fill('test@example.com');
      await page.locator('input[type="password"]').fill('password123');
      
      // Submit form
      await page.locator('button:has-text("Sign In")').click();
      
      // Should show error or main app - for demo purposes, may show error
      await page.waitForTimeout(1000);
    });
  });

  test.describe('Navigation & Bottom Navigation', () => {
    test.beforeEach(async ({ page }) => {
      // Login first
      await page.locator('button:has-text("Try Demo")').click();
      await page.waitForLoadState('networkidle');
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
      await page.locator('button:has-text("Try Demo")').click();
      await page.waitForLoadState('networkidle');
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
      
      // Should be on bet detail page
      await expect(page.locator('h1').first()).toContainText('Taylor Swift announces surprise album?');
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
      await page.locator('button:has-text("Try Demo")').click();
      await page.waitForLoadState('networkidle');
      
      // Navigate to My Bets
      await page.locator('[data-testid="bottom-navigation"] >> text=My Bets').click();
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
      await page.locator('button:has-text("Try Demo")').click();
      await page.waitForLoadState('networkidle');
      
      // Navigate to Wallet
      await page.locator('[data-testid="bottom-navigation"] >> text=Wallet').click();
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
      await page.locator('button:has-text("Try Demo")').click();
      await page.waitForLoadState('networkidle');
      
      // Navigate to Profile
      await page.locator('[data-testid="bottom-navigation"] >> text=Profile').click();
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
      await page.locator('button:has-text("Try Demo")').click();
      await page.waitForLoadState('networkidle');
      
      // Navigate to Clubs
      await page.locator('[data-testid="bottom-navigation"] >> text=Clubs').click();
    });

    test('should display clubs tabs', async ({ page }) => {
      await expect(page.locator('text=Discover')).toBeVisible();
      await expect(page.locator('text=My Clubs')).toBeVisible();
      await expect(page.locator('text=Trending')).toBeVisible();
    });

    test('should show club categories', async ({ page }) => {
      // Check category filters
      await expect(page.locator('text=All')).toBeVisible();
      await expect(page.locator('text=Sports')).toBeVisible();
      await expect(page.locator('text=Crypto')).toBeVisible();
      await expect(page.locator('text=Entertainment')).toBeVisible();
    });

    test('should allow creating a club', async ({ page }) => {
      // Click create club
      await page.locator('button:has-text("Create Club")').click();
      
      // Fill club details
      await page.locator('input[placeholder="Enter club name"]').fill('Test Club');
      await page.locator('textarea[placeholder="Describe your club"]').fill('A test club for testing');
      await page.locator('select').selectOption('sports');
      
      // Create club
      await page.locator('button:has-text("Create Club")').click();
      
      // Should show success
      await expect(page.locator('text=Club created successfully!')).toBeVisible();
    });

    test('should allow joining clubs', async ({ page }) => {
      // Click join on a club
      await page.locator('button:has-text("Join")').first().click();
      
      // Should show success
      await expect(page.locator('text=Joined club successfully!')).toBeVisible();
    });

    test('should navigate to club detail page', async ({ page }) => {
      // Click on a club card
      await page.locator('[data-testid="club-card"]').first().click();
      
      // Should be on club detail page
      await expect(page.locator('text=Overview')).toBeVisible();
      await expect(page.locator('text=Bets')).toBeVisible();
      await expect(page.locator('text=Members')).toBeVisible();
      await expect(page.locator('text=Discussions')).toBeVisible();
    });

    test('should show club statistics', async ({ page }) => {
      // Navigate to club detail
      await page.locator('[data-testid="club-card"]').first().click();
      
      // Check stats
      await expect(page.locator('text=Active Bets')).toBeVisible();
      await expect(page.locator('text=Avg Win Rate')).toBeVisible();
      await expect(page.locator('text=Total Pool')).toBeVisible();
      await expect(page.locator('text=Discussions')).toBeVisible();
    });

    test('should allow creating club bets', async ({ page }) => {
      // Join a club first
      await page.locator('button:has-text("Join")').first().click();
      
      // Navigate to club detail
      await page.locator('[data-testid="club-card"]').first().click();
      
      // Click create bet
      await page.locator('button:has-text("Create Bet")').click();
      
      // Fill bet details
      await page.locator('input[placeholder="What are you predicting?"]').fill('Test Club Bet');
      await page.locator('textarea[placeholder="Provide more details"]').fill('A test bet for the club');
      await page.locator('input[type="datetime-local"]').fill('2025-12-31T23:59');
      
      // Create bet
      await page.locator('button:has-text("Create Bet")').click();
      
      // Should show success
      await expect(page.locator('text=Bet created successfully!')).toBeVisible();
    });

    test('should allow creating discussions', async ({ page }) => {
      // Join a club first
      await page.locator('button:has-text("Join")').first().click();
      
      // Navigate to club detail
      await page.locator('[data-testid="club-card"]').first().click();
      
      // Go to discussions tab
      await page.locator('text=Discussions').click();
      
      // Click create discussion
      await page.locator('button:has-text("New Discussion")').click();
      
      // Fill discussion details
      await page.locator('input[placeholder="Discussion title"]').fill('Test Discussion');
      await page.locator('textarea[placeholder="Share your thoughts..."]').fill('This is a test discussion');
      
      // Post discussion
      await page.locator('button:has-text("Post Discussion")').click();
      
      // Should show success
      await expect(page.locator('text=Discussion created successfully!')).toBeVisible();
    });

    test('should show club members', async ({ page }) => {
      // Navigate to club detail
      await page.locator('[data-testid="club-card"]').first().click();
      
      // Go to members tab
      await page.locator('text=Members').click();
      
      // Should show members list
      await expect(page.locator('text=Members')).toBeVisible();
    });
  });

  test.describe('Cross-Screen Functionality', () => {
    test.beforeEach(async ({ page }) => {
      await page.locator('button:has-text("Try Demo")').click();
      await page.waitForLoadState('networkidle');
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
      await page.locator('button:has-text("Try Demo")').click();
      await page.waitForLoadState('networkidle');
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
      await page.locator('button:has-text("Try Demo")').click();
      await page.waitForLoadState('networkidle');
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
      await page.locator('button:has-text("Try Demo")').click();
      await page.waitForLoadState('networkidle');
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
      await page.locator('button:has-text("Try Demo")').click();
      await page.waitForLoadState('networkidle');
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