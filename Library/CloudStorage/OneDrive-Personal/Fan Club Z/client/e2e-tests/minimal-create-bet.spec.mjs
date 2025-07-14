import { test, expect } from '@playwright/test';
import fs from 'fs';

test('minimal create bet test', async ({ page }) => {
  await page.goto('http://localhost:3000');
  // Debug: print page content and take screenshot before clicking Try Demo
  const content = await page.content();
  fs.writeFileSync('debug-login-page.html', content);
  await page.screenshot({ path: 'debug-login-page.png', fullPage: true });
  // Login as demo user
  await page.locator('button:has-text("Try Demo")').click();
  await page.waitForTimeout(2000);
  // Navigate to Create Bet tab (update selector if needed)
  await page.locator('[data-testid="bottom-navigation"] >> text=Create').click();
  await page.waitForTimeout(1000);
  // Check for form fields
  await expect(page.locator('input[placeholder="Bet Title"]')).toBeVisible();
  await expect(page.locator('input[type="datetime-local"]')).toBeVisible();
  await expect(page.locator('input[placeholder="Min Stake"]')).toBeVisible();
  await expect(page.locator('input[placeholder="Max Stake"]')).toBeVisible();
  // Fill out the form
  await page.locator('input[placeholder="Bet Title"]').fill('Will Apple release a new iPhone this year?');
  await page.locator('input[type="datetime-local"]').fill('2025-12-31T23:59');
  await page.locator('input[placeholder="Min Stake"]').fill('10');
  await page.locator('input[placeholder="Max Stake"]').fill('1000');
  // Submit the form
  await page.locator('button:has-text("Create Bet")').click();
  // Check for success message or navigation
  await expect(page.locator('text=Bet created successfully')).toBeVisible();
}); 