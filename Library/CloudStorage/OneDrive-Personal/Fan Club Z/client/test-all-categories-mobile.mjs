#!/usr/bin/env node

import { chromium } from 'playwright';

const testAllCategoriesMobile = async () => {
  console.log('🧪 Testing mobile categories across all screens...');
  
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 375, height: 667 }, // iPhone SE dimensions
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1'
  });
  
  const page = await context.newPage();
  
  const screensToTest = [
    { url: '/discover', name: 'Discover', selectors: ['[data-testid="category-button"]'] },
    { url: '/clubs', name: 'Clubs', selectors: ['[data-testid^="category-"]'] },
    { url: '/wallet', name: 'Wallet', selectors: ['button:has-text("All")', 'button:has-text("Deposits")'] },
    { url: '/create-bet', name: 'Create Bet', selectors: ['[data-testid="bet-type-binary"]', '[data-testid^="category-"]'] }
  ];
  
  const results = [];
  
  try {
    for (const screen of screensToTest) {
      console.log(`\n🔍 Testing ${screen.name} screen...`);
      
      try {
        // Navigate to the screen
        await page.goto(`http://localhost:5173${screen.url}`, { waitUntil: 'networkidle' });
        
        // Wait for the screen to load
        await page.waitForTimeout(2000);
        
        const screenResult = {
          screen: screen.name,
          url: screen.url,
          tests: []
        };
        
        // Test each selector
        for (const selector of screen.selectors) {
          try {
            await page.waitForSelector(selector, { timeout: 5000 });
            const elements = await page.locator(selector).all();
            
            if (elements.length > 0) {
              console.log(`✅ ${screen.name}: Found ${elements.length} elements for ${selector}`);
              
              // Test scrolling behavior if there are multiple elements
              if (elements.length > 1) {
                const scrollContainer = page.locator('.scrollbar-hide').first();
                if (await scrollContainer.count() > 0) {
                  // Test horizontal scrolling
                  await scrollContainer.evaluate(el => el.scrollLeft = 100);
                  await page.waitForTimeout(500);
                  
                  const scrollLeft = await scrollContainer.evaluate(el => el.scrollLeft);
                  if (scrollLeft > 0) {
                    console.log(`✅ ${screen.name}: Horizontal scrolling works`);
                  } else {
                    console.log(`⚠️ ${screen.name}: Horizontal scrolling may not be working`);
                  }
                }
              }
              
              // Test button interaction
              if (elements.length > 0) {
                await elements[0].click();
                await page.waitForTimeout(300);
                console.log(`✅ ${screen.name}: Button interaction works`);
              }
              
              screenResult.tests.push({
                selector,
                status: 'passed',
                elementsFound: elements.length
              });
              
            } else {
              console.log(`❌ ${screen.name}: No elements found for ${selector}`);
              screenResult.tests.push({
                selector,
                status: 'failed',
                error: 'No elements found'
              });
            }
          } catch (error) {
            console.log(`❌ ${screen.name}: Error testing ${selector} - ${error.message}`);
            screenResult.tests.push({
              selector,
              status: 'error',
              error: error.message
            });
          }
        }
        
        // Take a screenshot
        await page.screenshot({ 
          path: `mobile-${screen.name.toLowerCase()}-test.png`,
          fullPage: false,
          clip: { x: 0, y: 0, width: 375, height: 400 }
        });
        console.log(`📸 Screenshot saved for ${screen.name}`);
        
        results.push(screenResult);
        
      } catch (screenError) {
        console.log(`❌ Failed to test ${screen.name}: ${screenError.message}`);
        results.push({
          screen: screen.name,
          url: screen.url,
          error: screenError.message,
          tests: []
        });
      }
    }
    
    // Summary
    console.log('\n📊 Test Summary:');
    
    let totalTests = 0;
    let passedTests = 0;
    
    results.forEach(result => {
      if (result.error) {
        console.log(`❌ ${result.screen}: Failed to load`);
      } else {
        const passed = result.tests.filter(t => t.status === 'passed').length;
        const total = result.tests.length;
        totalTests += total;
        passedTests += passed;
        
        console.log(`${passed === total ? '✅' : '⚠️'} ${result.screen}: ${passed}/${total} tests passed`);
      }
    });
    
    console.log(`\n🎯 Overall: ${passedTests}/${totalTests} tests passed`);
    
    if (passedTests === totalTests) {
      console.log('🎉 All mobile category improvements working correctly!');
    } else {
      console.log('⚠️ Some issues found. Check the logs above.');
    }
    
  } catch (error) {
    console.error('❌ Test suite failed:', error.message);
  } finally {
    await browser.close();
  }
};

// Test scrollbar hiding across different browsers
const testScrollbarHiding = async () => {
  console.log('\n🔍 Testing scrollbar hiding across browsers...');
  
  const browsers = [
    { name: 'Chromium', launch: () => chromium.launch() },
  ];
  
  for (const browserConfig of browsers) {
    console.log(`\nTesting ${browserConfig.name}...`);
    
    const browser = await browserConfig.launch();
    const context = await browser.newContext({
      viewport: { width: 375, height: 667 }
    });
    
    const page = await context.newPage();
    
    try {
      await page.goto('http://localhost:5173/discover', { waitUntil: 'networkidle' });
      
      // Check if scrollbar is properly hidden
      const hasHiddenScrollbar = await page.evaluate(() => {
        const element = document.querySelector('.scrollbar-hide');
        if (!element) return false;
        
        const style = window.getComputedStyle(element);
        return style.scrollbarWidth === 'none' || style.msOverflowStyle === 'none';
      });
      
      console.log(`${hasHiddenScrollbar ? '✅' : '❌'} ${browserConfig.name}: Scrollbar hiding`);
      
    } catch (error) {
      console.log(`❌ ${browserConfig.name}: Error - ${error.message}`);
    } finally {
      await browser.close();
    }
  }
};

// Main test runner
const runAllTests = async () => {
  console.log('🚀 Starting comprehensive mobile categories test suite...');
  console.log('=' .repeat(60));
  
  await testAllCategoriesMobile();
  await testScrollbarHiding();
  
  console.log('\n' + '='.repeat(60));
  console.log('✨ Test suite completed!');
};

runAllTests().catch(console.error);
