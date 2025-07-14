#!/usr/bin/env node

import { chromium } from 'playwright';

const testCategoriesMobile = async () => {
  console.log('🧪 Testing mobile categories display...');
  
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 375, height: 667 }, // iPhone SE dimensions
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1'
  });
  
  const page = await context.newPage();
  
  try {
    // Navigate to the app
    await page.goto('http://localhost:5173/discover', { waitUntil: 'networkidle' });
    
    // Wait for categories to load
    await page.waitForSelector('[data-testid="category-button"]', { timeout: 10000 });
    
    // Check if categories are visible
    const categories = await page.locator('[data-testid="category-button"]').all();
    console.log(`✅ Found ${categories.length} category buttons`);
    
    // Test scrolling behavior
    const categoryContainer = page.locator('.scrollbar-hide').first();
    await categoryContainer.scrollIntoViewIfNeeded();
    
    // Take a screenshot
    await page.screenshot({ 
      path: 'categories-mobile-test.png',
      fullPage: false,
      clip: { x: 0, y: 0, width: 375, height: 300 }
    });
    console.log('📸 Screenshot saved as categories-mobile-test.png');
    
    // Test category button interactions
    if (categories.length > 1) {
      await categories[1].click();
      await page.waitForTimeout(500);
      
      const isSelected = await categories[1].getAttribute('class');
      if (isSelected.includes('bg-blue-500')) {
        console.log('✅ Category selection works correctly');
      } else {
        console.log('❌ Category selection may have issues');
      }
    }
    
    // Check if scrollbar is hidden
    const scrollbarVisible = await page.evaluate(() => {
      const element = document.querySelector('.scrollbar-hide');
      const style = window.getComputedStyle(element);
      return style.scrollbarWidth !== 'none' && style.msOverflowStyle !== 'none';
    });
    
    if (!scrollbarVisible) {
      console.log('✅ Scrollbar is properly hidden');
    } else {
      console.log('⚠️ Scrollbar may still be visible');
    }
    
    console.log('🎉 Mobile categories test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
};

testCategoriesMobile().catch(console.error);
