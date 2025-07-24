#!/bin/bash

echo "🧪 Testing the 'Bet Not Found' fix..."

# Create the test script
cat > test-bet-fix.mjs << 'EOF'
import { chromium } from 'playwright';

async function testBetCreationAndViewing() {
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 1000 
  });
  
  try {
    const page = await browser.newPage();
    
    console.log('🚀 Starting bet creation and viewing test...');
    
    // Navigate to the app
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    
    console.log('✅ App loaded');
    
    // Wait for auth or navigate to login
    try {
      await page.waitForSelector('[data-testid="create-bet-tab"]', { timeout: 3000 });
      console.log('✅ User already authenticated');
    } catch {
      console.log('🔐 Need to authenticate - using demo login');
      
      // Look for demo login button
      const demoButton = await page.locator('button:has-text("Demo Login")').first();
      if (await demoButton.isVisible()) {
        await demoButton.click();
        await page.waitForSelector('[data-testid="create-bet-tab"]', { timeout: 10000 });
        console.log('✅ Demo login successful');
      } else {
        console.log('❌ No demo login available, test cannot proceed');
        return;
      }
    }
    
    // Navigate to Create Bet tab
    const createBetTab = await page.locator('[data-testid="create-bet-tab"]').first();
    await createBetTab.click();
    
    console.log('✅ Navigated to Create Bet tab');
    
    // Wait for the create bet form
    await page.waitForSelector('[data-testid="create-bet-form"]', { timeout: 5000 });
    
    // Fill in the bet details
    const testTitle = `Test Bet ${Date.now()}`;
    await page.fill('[data-testid="bet-title-input"]', testTitle);
    await page.fill('[data-testid="bet-description-input"]', 'This is a test bet to verify the fix');
    
    // Select binary bet type (should be selected by default)
    await page.click('[data-testid="bet-type-binary"]');
    
    // Select a category
    await page.click('[data-testid="category-sports"]');
    
    // Set deadline (7 days from now, should be default)
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + 7);
    const deadlineString = deadline.toISOString().slice(0, 16);
    await page.fill('[data-testid="bet-deadline-input"]', deadlineString);
    
    // Set stake amounts
    await page.fill('[data-testid="bet-min-stake-input"]', '5');
    await page.fill('[data-testid="bet-max-stake-input"]', '100');
    
    console.log('✅ Filled in bet details');
    
    // Submit the form
    const submitButton = await page.locator('[data-testid="create-bet-submit"]');
    await submitButton.click();
    
    console.log('⏳ Creating bet...');
    
    // Wait for either success navigation or error
    try {
      // Wait for navigation to bet detail page
      await page.waitForURL(/\/bets\/[a-f0-9-]+/, { timeout: 10000 });
      
      console.log('✅ Successfully navigated to bet detail page');
      
      // Check if the bet detail page loads without "Bet Not Found"
      const betNotFoundText = await page.locator('text=Bet Not Found').count();
      
      if (betNotFoundText === 0) {
        console.log('🎉 SUCCESS: Bet detail page loaded correctly!');
        
        // Wait a bit to see the page
        await page.waitForTimeout(3000);
        
        // Check if the bet title is displayed
        const titleVisible = await page.locator(`text=${testTitle}`).isVisible();
        if (titleVisible) {
          console.log('✅ Bet title is displayed correctly');
        } else {
          console.log('⚠️  Bet title not found on page');
        }
        
        return true;
      } else {
        console.log('❌ FAILURE: "Bet Not Found" message is still showing');
        return false;
      }
      
    } catch (error) {
      console.log('❌ FAILURE: Did not navigate to bet detail page or page timed out');
      console.log('Error:', error.message);
      
      // Check if there's an error message
      const errorMsg = await page.locator('[role="alert"], .text-red-500, .error').first().textContent();
      if (errorMsg) {
        console.log('Error message:', errorMsg);
      }
      
      return false;
    }
    
  } catch (error) {
    console.log('❌ Test failed with error:', error.message);
    return false;
  } finally {
    await browser.close();
  }
}

// Run the test
testBetCreationAndViewing().then(success => {
  if (success) {
    console.log('\n🎉 BET CREATION AND VIEWING TEST PASSED!');
    process.exit(0);
  } else {
    console.log('\n❌ BET CREATION AND VIEWING TEST FAILED!');
    process.exit(1);
  }
});
EOF

echo "📝 Test script created: test-bet-fix.mjs"
echo ""
echo "🔧 To run the test:"
echo "  1. Make sure your servers are running (npm run dev in both client and server)"
echo "  2. Run: node test-bet-fix.mjs"
echo ""
echo "📋 This test will:"
echo "  ✓ Navigate to the create bet page"
echo "  ✓ Fill in and submit a new bet"
echo "  ✓ Verify navigation to bet detail page"
echo "  ✓ Check that 'Bet Not Found' error doesn't appear"
echo "  ✓ Verify the bet details are displayed correctly"
