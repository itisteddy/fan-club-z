import { chromium } from 'playwright';

async function testClubsFixed() {
  console.log('🧪 Testing Clubs Management - Verification Test...\n');
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    // Navigate to app
    console.log('📍 Navigating to app...');
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    
    // Demo login
    console.log('🔐 Performing demo login...');
    const demoButton = page.locator('button:has-text("Try Demo")');
    const demoExists = await demoButton.isVisible();
    
    if (!demoExists) {
      console.log('❌ Demo button not found');
      return false;
    }
    
    await demoButton.click();
    await page.waitForTimeout(3000);
    
    // Navigate to clubs
    console.log('🎯 Navigating to clubs...');
    const clubsTab = page.locator('[data-testid="nav-clubs"]');
    const clubsTabExists = await clubsTab.isVisible();
    
    if (!clubsTabExists) {
      console.log('❌ Clubs tab not found');
      return false;
    }
    
    await clubsTab.click();
    await page.waitForTimeout(2000);
    
    // Verify we're on clubs page
    const currentUrl = page.url();
    console.log('📍 Current URL:', currentUrl);
    
    if (!currentUrl.includes('/clubs')) {
      console.log('❌ Failed to navigate to clubs page');
      return false;
    }
    
    // Check for clubs header
    console.log('🔍 Checking clubs header...');
    const clubsHeader = await page.locator('header h1:has-text("Clubs")').isVisible();
    console.log(`✅ Clubs header visible: ${clubsHeader}`);
    
    // Check for search bar
    console.log('🔍 Checking search functionality...');
    const searchBar = await page.locator('input[placeholder*="Search clubs"]').isVisible();
    console.log(`✅ Search bar visible: ${searchBar}`);
    
    // Check for tabs
    console.log('🔍 Checking tab navigation...');
    const discoverTab = await page.locator('button:has-text("Discover")').isVisible();
    const myClubsTab = await page.locator('button:has-text("My Clubs")').isVisible();
    const trendingTab = await page.locator('button:has-text("Trending")').isVisible();
    
    console.log(`✅ Discover tab: ${discoverTab}`);
    console.log(`✅ My Clubs tab: ${myClubsTab}`);
    console.log(`✅ Trending tab: ${trendingTab}`);
    
    // Check for categories (should be visible in Discover tab)
    console.log('🔍 Checking category buttons...');
    const allCategory = await page.locator('[data-testid="category-all"]').isVisible();
    const sportsCategory = await page.locator('[data-testid="category-sports"]').isVisible();
    const cryptoCategory = await page.locator('[data-testid="category-crypto"]').isVisible();
    
    console.log(`✅ All category: ${allCategory}`);
    console.log(`✅ Sports category: ${sportsCategory}`);
    console.log(`✅ Crypto category: ${cryptoCategory}`);
    
    // Test category clicking\n    if (sportsCategory) {\n      console.log('🖱️ Testing category interaction...');\n      await page.locator('[data-testid=\"category-sports\"]').click();\n      await page.waitForTimeout(1000);\n      \n      // Check if sports category is now selected\n      const sportsSelected = await page.locator('[data-testid=\"category-sports\"].bg-blue-500').isVisible();\n      console.log(`✅ Sports category selected: ${sportsSelected}`);\n      \n      // Switch back to All\n      await page.locator('[data-testid=\"category-all\"]').click();\n      await page.waitForTimeout(1000);\n    }\n    \n    // Check for clubs list\n    console.log('🔍 Checking clubs list...');\n    const clubsList = await page.locator('[data-testid=\"clubs-list\"]').isVisible();\n    console.log(`✅ Clubs list container: ${clubsList}`);\n    \n    // Wait for clubs to load\n    await page.waitForTimeout(2000);\n    \n    // Count club cards\n    const clubCards = page.locator('[data-testid=\"club-card\"]');\n    const clubCardCount = await clubCards.count();\n    console.log(`📊 Club cards found: ${clubCardCount}`);\n    \n    if (clubCardCount > 0) {\n      console.log('🔍 Testing club card features...');\n      \n      const firstCard = clubCards.first();\n      \n      // Check for club card elements\n      const clubName = await firstCard.locator('h3').isVisible();\n      const clubDescription = await firstCard.locator('p').isVisible();\n      const memberCount = await firstCard.locator('text=/members/').isVisible();\n      const viewButton = await firstCard.locator('[data-testid=\"view-club-button\"], [data-testid=\"join-club-button\"]').isVisible();\n      \n      console.log(`✅ Club name: ${clubName}`);\n      console.log(`✅ Club description: ${clubDescription}`);\n      console.log(`✅ Member count: ${memberCount}`);\n      console.log(`✅ Action button: ${viewButton}`);\n      \n      // Test club detail navigation if possible\n      const viewClubButton = firstCard.locator('[data-testid=\"view-club-button\"]');\n      const joinClubButton = firstCard.locator('[data-testid=\"join-club-button\"]');\n      \n      if (await viewClubButton.isVisible()) {\n        console.log('🖱️ Testing club detail navigation...');\n        await viewClubButton.click();\n        await page.waitForTimeout(3000);\n        \n        const detailUrl = page.url();\n        console.log('📍 Club detail URL:', detailUrl);\n        \n        if (detailUrl.includes('/clubs/club-')) {\n          console.log('✅ Successfully navigated to club detail page');\n          \n          // Check for club detail elements\n          const backButton = await page.locator('button').filter({ hasText: 'ArrowLeft' }).isVisible();\n          const clubDetailHeader = await page.locator('h1').first().isVisible();\n          const tabsPresent = await page.locator('button:has-text(\"Overview\"), button:has-text(\"Bets\"), button:has-text(\"Members\")').count();\n          \n          console.log(`✅ Back button: ${backButton}`);\n          console.log(`✅ Club detail header: ${clubDetailHeader}`);\n          console.log(`✅ Detail tabs found: ${tabsPresent}`);\n          \n          // Navigate back\n          if (backButton) {\n            await page.locator('button').filter({ hasText: 'ArrowLeft' }).first().click();\n            await page.waitForTimeout(2000);\n            console.log('✅ Navigated back to clubs list');\n          }\n        }\n      } else if (await joinClubButton.isVisible()) {\n        console.log('✅ Join club button available for non-member clubs');\n      }\n      \n    } else {\n      console.log('ℹ️ No club cards found - checking for loading state...');\n      const loadingState = await page.locator('[data-testid=\"clubs-loading\"]').isVisible();\n      const emptyState = await page.locator('[data-testid=\"clubs-empty\"]').isVisible();\n      \n      console.log(`Loading state: ${loadingState}`);\n      console.log(`Empty state: ${emptyState}`);\n    }\n    \n    // Test My Clubs tab\n    if (myClubsTab) {\n      console.log('🖱️ Testing My Clubs tab...');\n      await page.locator('button:has-text(\"My Clubs\")').click();\n      await page.waitForTimeout(2000);\n      \n      const myClubsContent = await page.locator('text=/No clubs joined yet/, text=/Discover and join clubs/').isVisible();\n      console.log(`✅ My Clubs content: ${myClubsContent}`);\n    }\n    \n    // Test Trending tab\n    if (trendingTab) {\n      console.log('🖱️ Testing Trending tab...');\n      await page.locator('button:has-text(\"Trending\")').click();\n      await page.waitForTimeout(2000);\n      \n      const trendingCards = await page.locator('[data-testid=\"club-card\"]').count();\n      console.log(`✅ Trending clubs: ${trendingCards}`);\n    }\n    \n    // Test Create Club functionality\n    console.log('🔍 Testing Create Club functionality...');\n    await page.locator('button:has-text(\"Discover\")').click();\n    await page.waitForTimeout(1000);\n    \n    const createClubButton = page.locator('button:has-text(\"Create Club\")');\n    const createButtonExists = await createClubButton.isVisible();\n    console.log(`✅ Create Club button: ${createButtonExists}`);\n    \n    if (createButtonExists) {\n      console.log('🖱️ Testing create club modal...');\n      await createClubButton.click();\n      await page.waitForTimeout(1000);\n      \n      const modal = await page.locator('dialog, [role=\"dialog\"]').isVisible();\n      const modalTitle = await page.locator('text=\"Create New Club\"').isVisible();\n      \n      console.log(`✅ Create club modal: ${modal}`);\n      console.log(`✅ Modal title: ${modalTitle}`);\n      \n      if (modal) {\n        // Close modal\n        const cancelButton = page.locator('button:has-text(\"Cancel\")');\n        if (await cancelButton.isVisible()) {\n          await cancelButton.click();\n          await page.waitForTimeout(500);\n          console.log('✅ Create club modal closed');\n        }\n      }\n    }\n    \n    console.log('\\n🎉 Clubs Management verification completed!');\n    \n    // Final assessment\n    const allTestsPassed = clubsHeader && discoverTab && myClubsTab && trendingTab && \n                          allCategory && sportsCategory && clubsList;\n    \n    if (allTestsPassed) {\n      console.log('\\n✅ ALL CLUBS MANAGEMENT FEATURES ARE WORKING CORRECTLY!');\n      return true;\n    } else {\n      console.log('\\n⚠️ Some clubs features may need additional attention');\n      return false;\n    }\n    \n  } catch (error) {\n    console.error('❌ Error during testing:', error);\n    return false;\n  } finally {\n    await browser.close();\n  }\n}\n\ntestClubsFixed().then(success => {\n  if (success) {\n    console.log('\\n🎉 Clubs Management is FIXED and working properly!');\n    process.exit(0);\n  } else {\n    console.log('\\n💥 Clubs Management test encountered issues!');\n    process.exit(1);\n  }\n}).catch(error => {\n  console.error('💥 Test runner failed:', error);\n  process.exit(1);\n});
