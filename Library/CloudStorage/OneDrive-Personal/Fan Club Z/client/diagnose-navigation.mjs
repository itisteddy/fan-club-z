import { chromium } from '@playwright/test';

async function diagnoseNavigation() {
  console.log('🔍 Diagnosing Navigation Issues...\n');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 1000
  });
  
  const page = await browser.newPage();
  
  // Capture all console messages
  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    
    if (type === 'error') {
      console.log('🔥 BROWSER ERROR:', text);
    } else if (text.includes('BottomNavigation')) {
      console.log('📱 NAV LOG:', text);
    }
  });
  
  try {
    console.log('📍 Step 1: Loading the app...');
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    console.log('📍 Current URL:', page.url());
    
    // Check authentication state first
    console.log('\n🔐 Step 2: Checking authentication state...');
    const isLoginPage = await page.locator('text=Welcome to Fan Club Z').isVisible();
    console.log('   Is on login page:', isLoginPage);
    
    if (isLoginPage) {
      console.log('   Looking for demo login...');
      const demoButton = page.locator('button:has-text("Try Demo")');
      const demoExists = await demoButton.isVisible();
      console.log('   Demo button exists:', demoExists);
      
      if (demoExists) {
        console.log('   Clicking demo login...');
        await demoButton.click();
        await page.waitForTimeout(3000);
        console.log('   URL after login:', page.url());
      }
    }
    
    // Detailed navigation analysis
    console.log('\n🔍 Step 3: Detailed navigation analysis...');
    
    // Check if BottomNavigation component exists in DOM
    const navComponent = await page.locator('[data-testid="bottom-navigation"]').count();
    console.log('   BottomNavigation components in DOM:', navComponent);
    
    if (navComponent > 0) {
      console.log('✅ BottomNavigation found in DOM');
      
      // Check visibility
      const isVisible = await page.locator('[data-testid="bottom-navigation"]').isVisible();
      console.log('   Is visible:', isVisible);
      
      // Check computed styles
      const styles = await page.locator('[data-testid="bottom-navigation"]').evaluate(el => {
        const computed = window.getComputedStyle(el);
        return {
          display: computed.display,
          position: computed.position,
          bottom: computed.bottom,
          zIndex: computed.zIndex,
          visibility: computed.visibility,
          opacity: computed.opacity,
          height: computed.height,
          width: computed.width
        };
      });
      
      console.log('   Computed styles:', styles);
      
      // Check individual tabs
      const tabs = await page.locator('[data-testid^="nav-"]').all();
      console.log('   Tab count:', tabs.length);
      
      for (let i = 0; i < tabs.length; i++) {
        const tab = tabs[i];
        const testId = await tab.getAttribute('data-testid');
        const isTabVisible = await tab.isVisible();
        const text = await tab.textContent();
        
        console.log(`   Tab ${i + 1}: ${testId} - "${text}" - Visible: ${isTabVisible}`);
      }
      
    } else {
      console.log('❌ BottomNavigation NOT found in DOM');
      
      // Check what's actually in the page
      console.log('\n🔍 Step 4: Debugging missing navigation...');
      
      // Check page structure
      const bodyContent = await page.evaluate(() => {
        return {
          bodyClasses: document.body.className,
          hasMainElement: !!document.querySelector('main'),
          hasHeaderElement: !!document.querySelector('header'),
          hasNavElement: !!document.querySelector('nav'),
          reactRootExists: !!document.querySelector('#root'),
          totalElements: document.querySelectorAll('*').length
        };
      });
      
      console.log('   Page structure:', bodyContent);
      
      // Look for any elements with navigation-related attributes
      const navElements = await page.locator('[class*="nav"], [class*="bottom"], [data-testid*="nav"]').count();
      console.log('   Navigation-related elements:', navElements);
      
      // Check for React errors
      const hasReactError = await page.locator('text=Something went wrong').isVisible();
      console.log('   React error boundary triggered:', hasReactError);
      
      // Check current route
      const currentPath = await page.evaluate(() => window.location.pathname);
      console.log('   Current path:', currentPath);
    }
    
    // Check for any fixed positioned elements
    console.log('\n📍 Step 5: Checking fixed positioning...');
    const fixedElements = await page.evaluate(() => {
      const elements = document.querySelectorAll('*');
      const fixed = [];
      
      for (let el of elements) {
        const style = window.getComputedStyle(el);
        if (style.position === 'fixed') {
          fixed.push({
            tagName: el.tagName,
            className: el.className,
            id: el.id,
            testId: el.getAttribute('data-testid'),
            bottom: style.bottom,
            zIndex: style.zIndex
          });
        }
      }
      
      return fixed;
    });
    
    console.log('   Fixed positioned elements:', fixedElements);
    
    // Take comprehensive screenshots
    console.log('\n📸 Step 6: Taking diagnostic screenshots...');
    await page.screenshot({ path: 'nav-diagnostic-full.png', fullPage: true });
    await page.screenshot({ path: 'nav-diagnostic-viewport.png', fullPage: false });
    
    console.log('📸 Screenshots saved:');
    console.log('   - nav-diagnostic-full.png (full page)');
    console.log('   - nav-diagnostic-viewport.png (viewport only)');
    
    // Final analysis
    console.log('\n📊 Step 7: Final analysis...');
    
    if (navComponent > 0) {
      console.log('✅ Navigation component is present in DOM');
      console.log('🔧 Next steps: Check CSS styles and z-index conflicts');
    } else {
      console.log('❌ Navigation component is missing from DOM');
      console.log('🔧 Next steps: Check App.tsx routing and component rendering');
    }
    
  } catch (error) {
    console.log('\n💥 Diagnostic Error:', error.message);
    await page.screenshot({ path: 'nav-diagnostic-error.png', fullPage: true });
  } finally {
    await browser.close();
  }
}

// Run the diagnostic
diagnoseNavigation().catch(console.error);