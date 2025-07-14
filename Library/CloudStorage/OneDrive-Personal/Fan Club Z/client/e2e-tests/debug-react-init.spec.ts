import { test, expect } from '@playwright/test';

test('Debug React initialization', async ({ page }) => {
  console.log('🔍 Debugging React initialization...');
  
  const consoleMessages: string[] = [];
  const errors: string[] = [];
  
  // Listen for console messages
  page.on('console', msg => {
    consoleMessages.push(`${msg.type()}: ${msg.text()}`);
    console.log(`📱 Console ${msg.type()}:`, msg.text());
  });
  
  // Listen for page errors
  page.on('pageerror', error => {
    errors.push(error.message);
    console.log('❌ Page error:', error.message);
  });
  
  await page.goto('http://localhost:3000');
  
  // Wait for page to load
  await page.waitForLoadState('networkidle');
  
  // Wait for React to potentially initialize
  await page.waitForTimeout(5000);
  
  // Check if React is loaded by looking for React-specific globals
  const reactGlobals = await page.evaluate(() => {
    return {
      hasReact: typeof window.React !== 'undefined',
      hasReactDOM: typeof window.ReactDOM !== 'undefined',
      hasReactDevTools: typeof window.__REACT_DEVTOOLS_GLOBAL_HOOK__ !== 'undefined',
      documentReadyState: document.readyState,
      hasRootElement: !!document.getElementById('root'),
      rootChildren: document.getElementById('root')?.children?.length || 0
    };
  });
  
  console.log('🔧 React globals check:', reactGlobals);
  
  // Check if there are any script errors
  const scriptErrors = await page.evaluate(() => {
    const scripts = document.querySelectorAll('script');
    const errors: string[] = [];
    
    scripts.forEach((script, index) => {
      if (script.src) {
        console.log(`Script ${index}: ${script.src}`);
      }
    });
    
    return errors;
  });
  
  // Check if the main.tsx script is loaded
  const mainScriptLoaded = await page.evaluate(() => {
    const scripts = Array.from(document.querySelectorAll('script[src*="main.tsx"]'));
    return scripts.length > 0;
  });
  
  console.log('📜 Main script loaded:', mainScriptLoaded);
  
  // Try to check if there are any React components rendered
  const reactComponents = await page.evaluate(() => {
    // Look for React fiber nodes
    const root = document.getElementById('root');
    if (!root) return 'No root element';
    
    // Check if React has rendered anything
    const reactInstance = (root as any)._reactInternalFiber || (root as any)._reactInternalInstance;
    return {
      hasReactInstance: !!reactInstance,
      rootInnerHTML: root.innerHTML.substring(0, 200),
      rootOuterHTML: root.outerHTML.substring(0, 200)
    };
  });
  
  console.log('⚛️ React components check:', reactComponents);
  
  // Check for any error boundaries or error states
  const errorStates = await page.evaluate(() => {
    const errorElements = document.querySelectorAll('[class*="error"], [class*="Error"], [data-testid*="error"]');
    return Array.from(errorElements).map(el => ({
      tagName: el.tagName,
      className: el.className,
      textContent: el.textContent?.substring(0, 100)
    }));
  });
  
  console.log('🚨 Error states found:', errorStates);
  
  // Take a screenshot
  await page.screenshot({ path: 'debug-react-init.png', fullPage: true });
  
  console.log('📊 Summary:');
  console.log('- Console messages:', consoleMessages.length);
  console.log('- Page errors:', errors.length);
  console.log('- React loaded:', reactGlobals.hasReact);
  console.log('- ReactDOM loaded:', reactGlobals.hasReactDOM);
  console.log('- Root children:', reactGlobals.rootChildren);
  console.log('- Main script loaded:', mainScriptLoaded);
  console.log('- Has React instance:', reactComponents.hasReactInstance);
  console.log('- Error states:', errorStates.length);
  
  // Log all console messages for debugging
  console.log('📱 All console messages:');
  consoleMessages.forEach((msg, i) => {
    console.log(`  ${i + 1}. ${msg}`);
  });
  
  // The app should have React loaded and some content
  expect(reactGlobals.hasReact).toBe(true);
  expect(reactGlobals.hasReactDOM).toBe(true);
}); 