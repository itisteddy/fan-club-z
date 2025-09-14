#!/usr/bin/env node

/**
 * Staging Smoke Tests
 * Basic health checks for staging deployment
 */

import { chromium } from 'playwright';

const STAGING_URL = process.env.STAGING_URL || 'https://fanclubz-staging.vercel.app';

async function smokeTest() {
  console.log('🧪 Starting staging smoke tests...');
  console.log(`🎯 Testing: ${STAGING_URL}`);
  
  let browser;
  let passed = 0;
  let failed = 0;
  
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    
    // Test 1: Home page loads
    console.log('📄 Testing staging home page load...');
    try {
      await page.goto(STAGING_URL, { waitUntil: 'networkidle', timeout: 30000 });
      const title = await page.title();
      if (title && title.includes('Fan Club Z')) {
        console.log('✅ Staging home page loads successfully');
        passed++;
      } else {
        console.log('❌ Staging home page title incorrect:', title);
        failed++;
      }
    } catch (error) {
      console.log('❌ Staging home page failed to load:', error.message);
      failed++;
    }
    
    // Test 2: API health check
    console.log('🔍 Testing staging API health...');
    try {
      const response = await page.request.get(`${STAGING_URL}/api/health`);
      if (response.ok()) {
        console.log('✅ Staging API health check passed');
        passed++;
      } else {
        console.log('❌ Staging API health check failed:', response.status());
        failed++;
      }
    } catch (error) {
      console.log('❌ Staging API health check error:', error.message);
      failed++;
    }
    
    // Test 3: Static assets load
    console.log('📦 Testing staging static assets...');
    try {
      const response = await page.request.get(`${STAGING_URL}/manifest.json`);
      if (response.ok()) {
        console.log('✅ Staging static assets load successfully');
        passed++;
      } else {
        console.log('❌ Staging static assets failed to load:', response.status());
        failed++;
      }
    } catch (error) {
      console.log('❌ Staging static assets error:', error.message);
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
    
    await page.goto(STAGING_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);
    
    if (errors.length === 0) {
      console.log('✅ No console errors found');
      passed++;
    } else {
      console.log('❌ Console errors found:', errors.length);
      errors.forEach(error => console.log('  -', error));
      failed++;
    }
    
    // Test 5: Basic functionality
    console.log('🔧 Testing basic functionality...');
    try {
      // Check if main navigation elements are present
      const discoverLink = await page.locator('text=Discover').count();
      const profileLink = await page.locator('text=Profile').count();
      
      if (discoverLink > 0 || profileLink > 0) {
        console.log('✅ Basic navigation elements present');
        passed++;
      } else {
        console.log('❌ Basic navigation elements missing');
        failed++;
      }
    } catch (error) {
      console.log('❌ Basic functionality test error:', error.message);
      failed++;
    }
    
  } catch (error) {
    console.error('❌ Staging smoke test setup failed:', error.message);
    failed++;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
  
  console.log('\n📊 Staging Smoke Test Results:');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
  
  if (failed > 0) {
    console.log('\n🚨 Staging smoke tests failed!');
    process.exit(1);
  } else {
    console.log('\n🎉 All staging smoke tests passed!');
    process.exit(0);
  }
}

smokeTest().catch(error => {
  console.error('❌ Staging smoke test failed:', error);
  process.exit(1);
});