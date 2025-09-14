#!/usr/bin/env node

/**
 * Production Smoke Tests
 * Basic health checks for production deployment
 */

import { chromium } from 'playwright';

const PRODUCTION_URL = 'https://app.fanclubz.app';

async function smokeTest() {
  console.log('🧪 Starting production smoke tests...');
  
  let browser;
  let passed = 0;
  let failed = 0;
  
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    
    // Test 1: Home page loads
    console.log('📄 Testing home page load...');
    try {
      await page.goto(PRODUCTION_URL, { waitUntil: 'networkidle', timeout: 30000 });
      const title = await page.title();
      if (title && title.includes('Fan Club Z')) {
        console.log('✅ Home page loads successfully');
        passed++;
      } else {
        console.log('❌ Home page title incorrect:', title);
        failed++;
      }
    } catch (error) {
      console.log('❌ Home page failed to load:', error.message);
      failed++;
    }
    
    // Test 2: API health check
    console.log('🔍 Testing API health...');
    try {
      const response = await page.request.get(`${PRODUCTION_URL}/api/health`);
      if (response.ok()) {
        console.log('✅ API health check passed');
        passed++;
      } else {
        console.log('❌ API health check failed:', response.status());
        failed++;
      }
    } catch (error) {
      console.log('❌ API health check error:', error.message);
      failed++;
    }
    
    // Test 3: Static assets load
    console.log('📦 Testing static assets...');
    try {
      const response = await page.request.get(`${PRODUCTION_URL}/manifest.json`);
      if (response.ok()) {
        console.log('✅ Static assets load successfully');
        passed++;
      } else {
        console.log('❌ Static assets failed to load:', response.status());
        failed++;
      }
    } catch (error) {
      console.log('❌ Static assets error:', error.message);
      failed++;
    }
    
    // Test 4: No console errors
    console.log('🐛 Checking for console errors...');
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    await page.goto(PRODUCTION_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);
    
    if (errors.length === 0) {
      console.log('✅ No console errors found');
      passed++;
    } else {
      console.log('❌ Console errors found:', errors.length);
      errors.forEach(error => console.log('  -', error));
      failed++;
    }
    
  } catch (error) {
    console.error('❌ Smoke test setup failed:', error.message);
    failed++;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
  
  console.log('\n📊 Smoke Test Results:');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
  
  if (failed > 0) {
    console.log('\n🚨 Production smoke tests failed!');
    process.exit(1);
  } else {
    console.log('\n🎉 All production smoke tests passed!');
    process.exit(0);
  }
}

smokeTest().catch(error => {
  console.error('❌ Smoke test failed:', error);
  process.exit(1);
});
