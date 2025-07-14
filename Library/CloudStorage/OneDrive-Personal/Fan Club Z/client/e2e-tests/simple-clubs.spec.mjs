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
    await page.locator('[data-testid="bottom-navigation"] >> text=Clubs').click();
    await page.waitForTimeout(2000);
    await expect(page.locator('header h1:has-text("Clubs")')).toBeVisible();
  });

  test('should show club categories', async ({ page }) => {
    await page.locator('[data-testid="bottom-navigation"] >> text=Clubs').click();
    await page.waitForTimeout(2000);
    const discoverTab = page.locator('[role="tab"]:has-text("Discover")');
    if (await discoverTab.isVisible()) {
      await discoverTab.click();
      await page.waitForTimeout(1000);
    }
    await expect(page.locator('[data-testid="category-all"]')).toBeVisible();
    await expect(page.locator('[data-testid="category-sports"]')).toBeVisible();
  });

  test('should show club cards', async ({ page }) => {
    await page.locator('[data-testid="bottom-navigation"] >> text=Clubs').click();
    await page.waitForTimeout(2000);
    await page.waitForTimeout(2000);
    const clubCards = page.locator('[data-testid="club-card"]');
    await expect(clubCards).toHaveCountGreaterThan(0);
  });
}); 