#!/usr/bin/env node

// Simple test to verify the onboarding flow integration
import { test, expect } from '@playwright/test';

console.log('🧪 Running onboarding integration test...');

test('Onboarding Flow Integration Test', async ({ page }) => {
  console.log('🚀 Starting onboarding integration test');

  // Navigate to app
  await page.goto('http://localhost:3000');
  await page.waitForLoadState('networkidle');
  console.log('✅ App loaded');

  // Check for demo button
  const demoButton = page.locator('[data-testid="demo-login-button"]');
  await expect(demoButton).toBeVisible({ timeout: 10000 });
  console.log('✅ Demo button found');

  // Click demo button
  await demoButton.click();
  console.log('✅ Demo button clicked');
  
  await page.waitForTimeout(3000);

  // Check URL
  const currentUrl = page.url();
  console.log(`📍 Current URL: ${currentUrl}`);

  // We should be on either onboarding page or discover page
  if (currentUrl.includes('/onboarding')) {
    console.log('✅ On onboarding page - testing onboarding flow');
    
    // Test onboarding steps
    // Welcome screen
    const welcomeText = page.locator('text=Welcome to Fan Club Z');
    if (await welcomeText.isVisible({ timeout: 3000 })) {
      console.log('✅ Welcome screen visible');
      
      const getStartedBtn = page.locator('button:has-text("Get Started")');
      if (await getStartedBtn.isVisible()) {
        await getStartedBtn.click();
        console.log('✅ Get Started clicked');
        await page.waitForTimeout(2000);
      }
    }

    // Terms of Service
    const termsTitle = page.locator('text=Terms of Service');
    if (await termsTitle.isVisible({ timeout: 5000 })) {
      console.log('✅ Terms page visible');
      const agreeBtn = page.locator('button:has-text("I Agree")');
      await agreeBtn.click();
      console.log('✅ Terms accepted');
      await page.waitForTimeout(2000);
    }

    // Privacy Policy
    const privacyTitle = page.locator('text=Privacy Policy');
    if (await privacyTitle.isVisible({ timeout: 5000 })) {
      console.log('✅ Privacy page visible');
      const agreeBtn = page.locator('button:has-text("I Agree")');
      await agreeBtn.click();
      console.log('✅ Privacy accepted');
      await page.waitForTimeout(2000);
    }

    // Responsible Gambling
    const responsibleTitle = page.locator('text=Responsible Gambling');
    if (await responsibleTitle.isVisible({ timeout: 5000 })) {
      console.log('✅ Responsible Gambling page visible');
      const closeBtn = page.locator('button:has-text("Close")');
      await closeBtn.click();
      console.log('✅ Responsible Gambling closed');
      await page.waitForTimeout(2000);
    }

    // Setup Complete
    const completeTitle = page.locator('text=Setup Complete!');
    if (await completeTitle.isVisible({ timeout: 5000 })) {
      console.log('✅ Setup Complete page visible');
      const startBtn = page.locator('button:has-text("Start Exploring")');
      await startBtn.click();
      console.log('✅ Start Exploring clicked');
      await page.waitForTimeout(3000);
    }
  }

  // Final check - should be in main app
  const bottomNav = page.locator('[data-testid="bottom-navigation"]');
  await expect(bottomNav).toBeVisible({ timeout: 10000 });
  console.log('✅ Bottom navigation visible');

  const discoverHeader = page.locator('header h1:has-text("Discover")');
  await expect(discoverHeader).toBeVisible({ timeout: 5000 });
  console.log('✅ On Discover page');

  console.log('🎉 Onboarding integration test completed successfully!');
});
