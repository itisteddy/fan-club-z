import { test, expect } from '@playwright/test';

test.describe('Basic Playwright Test', () => {
  test('should be able to load the home page', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await expect(page).toHaveTitle(/Fan Club Z/);
  });

  test('should find demo button', async ({ page }) => {
    await page.goto('http://localhost:3000');
    const demoButton = page.locator('button:has-text("Try Demo")');
    await expect(demoButton).toBeVisible();
  });
});
