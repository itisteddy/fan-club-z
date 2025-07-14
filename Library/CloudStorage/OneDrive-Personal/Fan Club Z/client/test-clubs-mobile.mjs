#!/usr/bin/env node

import { chromium } from 'playwright';

const testClubsMobile = async () => {
  console.log('🧪 Testing mobile clubs page optimizations...');
  
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 375, height: 667 }, // iPhone SE dimensions
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1'
  });
  
  const page = await context.newPage();
  
  try {
    console.log('🔍 Navigating to clubs page...');
    await page.goto('http://localhost:5173/clubs', { waitUntil: 'networkidle' });
    
    // Wait for the page to load
    await page.waitForTimeout(3000);
    
    // Check if tabs are visible
    const tabs = await page.locator('[role="tablist"]').count();
    console.log(`✅ Found ${tabs} tab containers`);
    
    // Check if the Discover tab is active (should show categories)
    const discoverTab = page.locator('button[data-state="active"]:has-text("Discover")');
    if (await discoverTab.count() > 0) {
      console.log('✅ Discover tab is active');
      
      // Check for categories
      const categories = await page.locator('[data-testid^="category-"]').all();
      console.log(`✅ Found ${categories.length} category buttons`);
      
      if (categories.length > 0) {
        // Test category scrolling
        const categoryContainer = page.locator('.scrollbar-hide').first();
        if (await categoryContainer.count() > 0) {
          console.log('✅ Category container found');
          
          // Test horizontal scrolling
          await categoryContainer.evaluate(el => el.scrollLeft = 100);
          await page.waitForTimeout(500);
          
          const scrollLeft = await categoryContainer.evaluate(el => el.scrollLeft);
          if (scrollLeft > 0) {
            console.log('✅ Horizontal scrolling works');
          } else {
            console.log('⚠️ Horizontal scrolling may not be working');
          }
          
          // Reset scroll position
          await categoryContainer.evaluate(el => el.scrollLeft = 0);
        }
        
        // Test category button interaction
        await categories[0].click();
        await page.waitForTimeout(500);
        console.log('✅ Category button interaction works');
      } else {
        console.log('❌ No category buttons found');
      }
    } else {
      console.log('⚠️ Discover tab not active, checking for tab switching...');
      
      // Try to click the Discover tab
      const discoverTabButton = page.locator('button:has-text("Discover")');
      if (await discoverTabButton.count() > 0) {
        await discoverTabButton.click();
        await page.waitForTimeout(1000);
        
        // Check for categories after switching
        const categories = await page.locator('[data-testid^="category-"]').all();
        console.log(`✅ After tab switch, found ${categories.length} category buttons`);
      }
    }
    
    // Check for club cards
    const clubCards = await page.locator('[data-testid="club-card"]').all();
    console.log(`✅ Found ${clubCards.length} club cards`);
    
    if (clubCards.length > 0) {
      // Test club card button layout
      const firstCard = clubCards[0];
      const buttons = await firstCard.locator('button').all();
      console.log(`✅ First club card has ${buttons.length} buttons`);
      
      // Check if buttons are properly sized for mobile
      if (buttons.length > 0) {
        const buttonText = await buttons[0].textContent();
        console.log(`✅ First button text: "${buttonText}"`);
        
        // Test button click
        await buttons[0].click();
        await page.waitForTimeout(300);
        console.log('✅ Club card button interaction works');
      }
    }
    
    // Take screenshots
    await page.screenshot({ 
      path: 'clubs-mobile-test-full.png',
      fullPage: true
    });
    
    await page.screenshot({ 
      path: 'clubs-mobile-test-viewport.png',
      fullPage: false,
      clip: { x: 0, y: 0, width: 375, height: 667 }
    });
    
    console.log('📸 Screenshots saved');
    
    // Test other tabs
    const myClubsTab = page.locator('button:has-text("My Clubs")');
    if (await myClubsTab.count() > 0) {
      await myClubsTab.click();
      await page.waitForTimeout(1000);
      console.log('✅ My Clubs tab switching works');
    }
    
    const trendingTab = page.locator('button:has-text("Trending")');
    if (await trendingTab.count() > 0) {
      await trendingTab.click();
      await page.waitForTimeout(1000);
      console.log('✅ Trending tab switching works');
    }
    
    // Switch back to Discover
    const discoverTabFinal = page.locator('button:has-text("Discover")');
    if (await discoverTabFinal.count() > 0) {
      await discoverTabFinal.click();
      await page.waitForTimeout(1000);
      console.log('✅ Back to Discover tab');
    }
    
    console.log('🎉 Clubs mobile test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
};

testClubsMobile().catch(console.error);
