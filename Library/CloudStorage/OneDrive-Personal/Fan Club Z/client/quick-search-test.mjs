import { chromium } from '@playwright/test';

async function quickSearchTest() {
  console.log('🔍 Quick Search Test...\n');
  
  const browser = await chromium.launch({ headless: false, slowMo: 1000 });
  const page = await browser.newPage();

  try {
    console.log('📱 Navigating to app...');
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');

    console.log('🔐 Demo login...');
    await page.locator('button:has-text("Try Demo")').click();
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('[data-testid="bottom-navigation"]', { timeout: 10000 });

    console.log('🧭 Navigate to Discover...');
    await page.locator('[data-testid="bottom-navigation"] >> text=Discover').click();
    await page.waitForTimeout(1000);

    console.log('🔍 Testing search input...');
    const searchInput = page.locator('input[placeholder="Search bets..."]');
    await searchInput.waitFor({ timeout: 5000 });
    console.log('✅ Search input found');

    console.log('⌨️ Typing "Bitcoin" in search...');
    await searchInput.fill('Bitcoin');
    await page.waitForTimeout(1000);

    console.log('🔍 Checking search results...');
    const searchResults = page.locator('text=Search Results');
    await searchResults.waitFor({ timeout: 3000 });
    console.log('✅ Search Results header found');

    const bitcoinBet = page.locator('text=Will Bitcoin reach $100K');
    await bitcoinBet.waitFor({ timeout: 3000 });
    console.log('✅ Bitcoin bet found in results');

    console.log('🧹 Clearing search...');
    await searchInput.clear();
    await page.waitForTimeout(1000);

    const trendingHeader = page.locator('text=Trending Now');
    await trendingHeader.waitFor({ timeout: 3000 });
    console.log('✅ Back to Trending Now after clearing');

    console.log('🎉 All search tests passed!');

  } catch (error) {
    console.log('❌ Test failed:', error.message);
    await page.screenshot({ path: 'search-test-error.png', fullPage: true });
    console.log('📸 Screenshot saved: search-test-error.png');
  } finally {
    await browser.close();
  }
}

quickSearchTest().catch(console.error);
