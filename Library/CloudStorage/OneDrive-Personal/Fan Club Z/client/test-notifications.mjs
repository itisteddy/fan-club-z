import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    console.log('🧪 Testing notification functionality...');
    
    // Navigate to app
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    
    // Login with demo user
    console.log('📝 Logging in with demo user...');
    await page.locator('button:has-text("Try Demo")').click();
    await page.waitForLoadState('networkidle');
    
    // Wait for app to load
    await page.waitForTimeout(3000);
    
    // Test 1: Check if notification bell is visible
    console.log('🔔 Test 1: Checking notification bell visibility...');
    const notificationBell = page.locator('[data-testid="notification-bell"]');
    const bellAlternative = page.locator('button:has([data-lucide="bell"])');
    
    let bellVisible = false;
    try {
      await page.waitForSelector('[data-testid="notification-bell"], button:has([data-lucide="bell"])', { timeout: 5000 });
      bellVisible = await notificationBell.isVisible() || await bellAlternative.isVisible();
    } catch (error) {
      console.log('⚠️ Notification bell not found with expected selectors');
    }
    
    if (bellVisible) {
      console.log('✅ Notification bell is visible');
    } else {
      console.log('❌ Notification bell is NOT visible');
      
      // Debug: Check what notification-related elements exist
      const bellIcons = await page.locator('[data-lucide="bell"]').count();
      console.log(`🔍 Found ${bellIcons} bell icons on page`);
      
      if (bellIcons > 0) {
        console.log('🔍 Bell icons found, checking parent buttons...');
        const bellButtons = await page.locator('button:has([data-lucide="bell"])').count();
        console.log(`🔍 Found ${bellButtons} buttons with bell icons`);
        
        if (bellButtons > 0) {
          console.log('✅ Notification bell button exists (but may need proper test ID)');
        }
      }
    }
    
    // Test 2: Click notification bell and check if notification center opens
    console.log('🔔 Test 2: Testing notification center opening...');
    try {
      // Try clicking the notification bell
      const bellElement = await notificationBell.isVisible() ? notificationBell : bellAlternative;
      await bellElement.click();
      
      // Wait for notification center to appear
      await page.waitForTimeout(1000);
      
      // Check if notification center/panel is visible
      const notificationCenter = page.locator('[data-testid="notification-center"]');
      const notificationModal = page.locator('text=Notifications').locator('..');
      
      const centerVisible = await notificationCenter.isVisible() || await notificationModal.isVisible();
      
      if (centerVisible) {
        console.log('✅ Notification center opened successfully');
      } else {
        console.log('❌ Notification center did NOT open');
        
        // Debug: Take screenshot to see current state
        await page.screenshot({ path: 'notification-center-debug.png', fullPage: true });
        console.log('📸 Screenshot saved: notification-center-debug.png');
      }
      
    } catch (error) {
      console.log('❌ Failed to click notification bell:', error.message);
    }
    
    // Test 3: Check notification actions (if center is open)
    console.log('🔔 Test 3: Testing notification actions...');
    try {
      // Look for notification-related action buttons
      const markAllReadButton = page.locator('button:has-text("Mark all as read"), button:has-text("Mark All as Read")');
      const clearAllButton = page.locator('button:has-text("Clear all"), button:has-text("Clear All")');
      
      const markAllVisible = await markAllReadButton.isVisible();
      const clearAllVisible = await clearAllButton.isVisible();
      
      if (markAllVisible || clearAllVisible) {
        console.log('✅ Notification action buttons found');
        
        if (markAllVisible) {
          console.log('✅ "Mark all as read" button is available');
        }
        if (clearAllVisible) {
          console.log('✅ "Clear all" button is available');
        }
      } else {
        console.log('❌ Notification action buttons NOT found');
      }
      
    } catch (error) {
      console.log('❌ Error testing notification actions:', error.message);
    }
    
    // Test 4: Test adding a notification (if test component exists)
    console.log('🔔 Test 4: Testing notification creation...');
    try {
      // Navigate to a page that might have notification test functionality
      await page.goto('http://localhost:3000/profile');
      await page.waitForTimeout(2000);
      
      // Look for any notification test elements
      const addNotificationButton = page.locator('button:has-text("Add Notification"), button:has-text("Test Notification")');
      
      if (await addNotificationButton.isVisible()) {
        console.log('✅ Test notification functionality found');
        await addNotificationButton.click();
        await page.waitForTimeout(1000);
        
        // Check if notification count increased
        const notificationBadge = page.locator('[data-testid="notification-badge"]');
        if (await notificationBadge.isVisible()) {
          const count = await notificationBadge.textContent();
          console.log(`✅ Notification badge shows: ${count}`);
        }
      } else {
        console.log('ℹ️ No test notification functionality found (expected)');
      }
      
    } catch (error) {
      console.log('❌ Error testing notification creation:', error.message);
    }
    
    // Test 5: Check notification persistence
    console.log('🔔 Test 5: Testing notification persistence...');
    try {
      // Navigate back to discover and check if notifications persist
      await page.goto('http://localhost:3000/discover');
      await page.waitForTimeout(2000);
      
      // Check if notification bell still shows badge/count
      const persistentBell = page.locator('button:has([data-lucide="bell"])');
      const badge = persistentBell.locator('span');
      
      if (await badge.isVisible()) {
        const badgeText = await badge.textContent();
        console.log(`✅ Notification badge persists: ${badgeText}`);
      } else {
        console.log('ℹ️ No notification badge (may be expected if no notifications)');
      }
      
    } catch (error) {
      console.log('❌ Error testing notification persistence:', error.message);
    }
    
    // Summary
    console.log('\n📊 NOTIFICATION TEST SUMMARY:');
    console.log('================================');
    
    // Re-check key functionality
    const finalBellCheck = await page.locator('button:has([data-lucide="bell"])').isVisible();
    console.log(`🔔 Notification Bell Present: ${finalBellCheck ? '✅ YES' : '❌ NO'}`);
    
    if (finalBellCheck) {
      await page.locator('button:has([data-lucide="bell"])').click();
      await page.waitForTimeout(1000);
      
      const finalCenterCheck = await page.locator('text=Notifications').isVisible();
      console.log(`📋 Notification Center Opens: ${finalCenterCheck ? '✅ YES' : '❌ NO'}`);
      
      if (finalCenterCheck) {
        const actionsCheck = await page.locator('button:has-text("Mark all"), button:has-text("Clear all")').isVisible();
        console.log(`⚡ Notification Actions Work: ${actionsCheck ? '✅ YES' : '❌ NO'}`);
      }
    }
    
    console.log('\n🎯 REQUIRED FIXES:');
    console.log('==================');
    
    if (!finalBellCheck) {
      console.log('❌ CRITICAL: Notification bell is not visible/accessible');
      console.log('   → Need to add proper data-testid="notification-bell" to notification button');
      console.log('   → Ensure notification button is rendered in MainHeader');
    }
    
    if (finalBellCheck) {
      await page.locator('button:has([data-lucide="bell"])').click();
      await page.waitForTimeout(1000);
      const centerVisible = await page.locator('text=Notifications').isVisible();
      
      if (!centerVisible) {
        console.log('❌ CRITICAL: Notification center does not open when bell is clicked');
        console.log('   → Check NotificationCenter component integration');
        console.log('   → Verify onClick handler for notification bell');
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed with error:', error);
  } finally {
    await browser.close();
  }
})();
