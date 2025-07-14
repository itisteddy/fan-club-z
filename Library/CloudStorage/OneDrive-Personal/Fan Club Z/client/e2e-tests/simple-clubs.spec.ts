import { test, expect } from '@playwright/test';

test.describe('Simple Clubs Test', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    
    // Demo login
    await page.locator('button:has-text("Try Demo")').click();
    await page.waitForTimeout(3000);
  });

  test('should navigate to clubs page', async ({ page }) => {
    // Navigate to clubs using the correct selector from BottomNavigation
    await page.locator('[data-testid="bottom-navigation"] >> text=Clubs').click();
    await page.waitForTimeout(2000);
    
    // Check for clubs header
    await expect(page.locator('header h1:has-text("Clubs")')).toBeVisible();
  });

  test('should show club categories', async ({ page }) => {
    // Navigate to clubs using the correct selector
    await page.locator('[data-testid="bottom-navigation"] >> text=Clubs').click();
    await page.waitForTimeout(2000);
    
    // Ensure we're on the Discover tab
    const discoverTab = page.locator('[role="tab"]:has-text("Discover")');
    if (await discoverTab.isVisible()) {
      await discoverTab.click();
      await page.waitForTimeout(1000);
    }
    
    // Check category filters
    await expect(page.locator('[data-testid="category-all"]')).toBeVisible();
    await expect(page.locator('[data-testid="category-sports"]')).toBeVisible();
  });

  test('should show club cards', async ({ page }) => {
    // Navigate to clubs using the correct selector
    await page.locator('[data-testid="bottom-navigation"] >> text=Clubs').click();
    await page.waitForTimeout(2000);
    
    // Wait for clubs to load
    await page.waitForTimeout(2000);
    
    // Check for club cards
    const clubCards = page.locator('[data-testid="club-card"]');
    await expect(clubCards).toHaveCountGreaterThan(0);
  });
});
