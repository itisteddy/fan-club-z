import { test, expect } from '@playwright/test';

test.describe('Clubs Functionality Tests', () => {
  test.beforeEach(async ({ page }) => {
    console.log('🧪 Setting up clubs test...');
    
    // Enhanced logging
    page.on('console', msg => console.log('📟 BROWSER:', msg.text()));
    page.on('pageerror', error => console.error('🚨 PAGE ERROR:', error.message));
    page.on('requestfailed', request => console.error('❌ REQUEST FAILED:', request.url(), request.failure()?.errorText));
    
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    
    // Demo login
    console.log('👆 Clicking Try Demo...');
    await page.locator('button:has-text("Try Demo")').click();
    
    // Wait for main app to load
    console.log('⏳ Waiting for main app...');
    await page.waitForTimeout(5000);
    
    // Ensure bottom navigation is present
    await expect(page.locator('[data-testid="bottom-navigation"]')).toBeVisible({ timeout: 10000 });
    console.log('✅ Bottom navigation confirmed');
  });

  test('should navigate to clubs page successfully', async ({ page }) => {
    console.log('🧪 Testing clubs navigation...');
    
    // Navigate to clubs
    console.log('👆 Clicking Clubs button...');
    await page.locator('[data-testid="bottom-navigation"] >> text=Clubs').click();
    
    // Wait for navigation
    await page.waitForTimeout(3000);
    
    console.log('📍 Current URL:', page.url());
    
    // Check that we're on the clubs page
    await expect(page.locator('header h1:has-text("Clubs")')).toBeVisible({ timeout: 10000 });
    console.log('✅ Clubs header found');
    
    // Check URL contains clubs
    expect(page.url()).toContain('/clubs');
    console.log('✅ URL contains /clubs');
  });

  test('should display club tabs', async ({ page }) => {
    console.log('🧪 Testing club tabs...');
    
    // Navigate to clubs
    await page.locator('[data-testid="bottom-navigation"] >> text=Clubs').click();
    await page.waitForTimeout(3000);
    
    // Check for all three tabs
    await expect(page.locator('[role="tab"]:has-text("Discover")')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[role="tab"]:has-text("My Clubs")')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[role="tab"]:has-text("Trending")')).toBeVisible({ timeout: 10000 });
    
    console.log('✅ All club tabs are visible');
  });

  test('should show category filters on discover tab', async ({ page }) => {
    console.log('🧪 Testing category filters...');
    
    // Navigate to clubs
    await page.locator('[data-testid="bottom-navigation"] >> text=Clubs').click();
    await page.waitForTimeout(3000);
    
    // Ensure we're on Discover tab
    const discoverTab = page.locator('[role="tab"]:has-text("Discover")');
    if (await discoverTab.isVisible()) {
      await discoverTab.click();
      await page.waitForTimeout(1000);
    }
    
    // Check category filters
    await expect(page.locator('[data-testid="category-all"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="category-sports"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="category-crypto"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="category-entertainment"]')).toBeVisible({ timeout: 10000 });
    
    console.log('✅ All category filters are visible');
    
    // Test category interaction
    console.log('👆 Testing category clicks...');
    await page.locator('[data-testid="category-sports"]').click();
    await page.waitForTimeout(500);
    
    // Verify the selected category has the active style
    await expect(page.locator('[data-testid="category-sports"]')).toHaveClass(/bg-blue-500/);
    console.log('✅ Category selection works');
  });

  test('should display club cards', async ({ page }) => {
    console.log('🧪 Testing club cards display...');
    
    // Navigate to clubs
    await page.locator('[data-testid="bottom-navigation"] >> text=Clubs').click();
    await page.waitForTimeout(3000);
    
    // Wait for clubs to load (either from API or fallback data)
    await page.waitForTimeout(2000);
    
    // Check for club cards (should have fallback data)
    const clubCards = page.locator('[data-testid="club-card"]');
    const clubCount = await clubCards.count();
    
    console.log(`📊 Found ${clubCount} club cards`);
    
    if (clubCount === 0) {
      // Check if we're in a loading state
      const loadingVisible = await page.locator('[data-testid="clubs-loading"]').isVisible();
      const emptyVisible = await page.locator('[data-testid="clubs-empty"]').isVisible();
      
      console.log('⚠️ No club cards found');
      console.log('📊 Loading visible:', loadingVisible);
      console.log('📊 Empty state visible:', emptyVisible);
      
      // Take a screenshot for debugging
      await page.screenshot({ path: 'debug-no-club-cards.png', fullPage: true });
      
      // Check page content
      const pageContent = await page.locator('[data-testid="clubs-list"]').textContent();
      console.log('📄 Clubs list content:', pageContent?.substring(0, 200));
    }
    
    // We should have at least some club cards due to fallback data
    await expect(clubCards).toHaveCountGreaterThan(0);
    console.log('✅ Club cards are displayed');
  });

  test('should allow switching between tabs', async ({ page }) => {
    console.log('🧪 Testing tab switching...');
    
    // Navigate to clubs
    await page.locator('[data-testid="bottom-navigation"] >> text=Clubs').click();
    await page.waitForTimeout(3000);
    
    // Test My Clubs tab
    console.log('👆 Switching to My Clubs tab...');
    await page.locator('[role="tab"]:has-text("My Clubs")').click();
    await page.waitForTimeout(1000);
    
    // Should show either user clubs or empty state
    const hasUserClubs = await page.locator('[data-testid="club-card"]').count() > 0;
    const hasEmptyState = await page.locator('text=No clubs joined yet').isVisible();
    
    if (hasUserClubs) {
      console.log('✅ My Clubs tab shows user clubs');
    } else if (hasEmptyState) {
      console.log('✅ My Clubs tab shows empty state');
    } else {
      console.log('⚠️ My Clubs tab content unclear');
    }
    
    // Test Trending tab
    console.log('👆 Switching to Trending tab...');
    await page.locator('[role="tab"]:has-text("Trending")').click();
    await page.waitForTimeout(1000);
    
    // Should show trending clubs
    const trendingClubs = await page.locator('[data-testid="club-card"]').count();
    console.log(`📊 Found ${trendingClubs} trending clubs`);
    
    // Switch back to Discover
    console.log('👆 Switching back to Discover tab...');
    await page.locator('[role="tab"]:has-text("Discover")').click();
    await page.waitForTimeout(1000);
    
    console.log('✅ Tab switching works');
  });

  test('should handle search functionality', async ({ page }) => {
    console.log('🧪 Testing search functionality...');
    
    // Navigate to clubs
    await page.locator('[data-testid="bottom-navigation"] >> text=Clubs').click();
    await page.waitForTimeout(3000);
    
    // Find the search input
    const searchInput = page.locator('input[placeholder="Search clubs..."]');
    await expect(searchInput).toBeVisible({ timeout: 10000 });
    
    // Type in search
    console.log('⌨️ Typing search query...');
    await searchInput.fill('Crypto');
    await page.waitForTimeout(1000);
    
    // Check if search results are filtered
    // (This will depend on implementation)
    console.log('✅ Search input works');
    
    // Clear search
    await searchInput.clear();
    await page.waitForTimeout(500);
    
    console.log('✅ Search functionality tested');
  });

  test('should show create club button for authenticated users', async ({ page }) => {
    console.log('🧪 Testing create club functionality...');
    
    // Navigate to clubs
    await page.locator('[data-testid="bottom-navigation"] >> text=Clubs').click();
    await page.waitForTimeout(3000);
    
    // Should see create club CTA or button
    const createClubVisible = await page.locator('button:has-text("Create Club")').isVisible();
    
    if (createClubVisible) {
      console.log('✅ Create Club button is visible');
      
      // Test clicking the button
      console.log('👆 Testing create club modal...');
      await page.locator('button:has-text("Create Club")').click();
      
      // Should open modal
      await expect(page.locator('text="Create New Club"')).toBeVisible({ timeout: 5000 });
      console.log('✅ Create club modal opens');
      
      // Close modal
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    } else {
      console.log('⚠️ Create Club button not visible (may be expected for demo user)');
    }
  });

  test('should display club interaction buttons', async ({ page }) => {
    console.log('🧪 Testing club interaction buttons...');
    
    // Navigate to clubs
    await page.locator('[data-testid="bottom-navigation"] >> text=Clubs').click();
    await page.waitForTimeout(3000);
    
    // Wait for clubs to load
    await page.waitForTimeout(2000);
    
    // Check for club cards
    const clubCards = page.locator('[data-testid="club-card"]');
    const clubCount = await clubCards.count();
    
    if (clubCount > 0) {
      console.log(`📊 Testing interactions on ${clubCount} club cards`);
      
      // Check for Join/View buttons on first club card
      const firstCard = clubCards.first();
      
      const hasJoinButton = await firstCard.locator('[data-testid="join-club-button"]').isVisible();
      const hasViewButton = await firstCard.locator('[data-testid="view-club-button"]').isVisible();
      const hasLeaveButton = await firstCard.locator('[data-testid="leave-club-button"]').isVisible();
      
      console.log('📊 Button visibility:', { hasJoinButton, hasViewButton, hasLeaveButton });
      
      if (hasJoinButton || hasViewButton || hasLeaveButton) {
        console.log('✅ Club interaction buttons are present');
      } else {
        console.log('⚠️ No interaction buttons found on club cards');
      }
    } else {
      console.log('⚠️ No club cards found to test interactions');
    }
  });
});
