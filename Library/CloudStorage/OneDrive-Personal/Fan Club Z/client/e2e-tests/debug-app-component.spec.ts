import { test, expect } from '@playwright/test';

test('Debug App component import and rendering', async ({ page }) => {
  console.log('🔍 Debugging App component import and rendering...');
  
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
  
  // Wait for React to potentially render
  await page.waitForTimeout(5000);
  
  // Check if React is loaded
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
  
  // Check if there are any script loading errors
  const scripts = await page.evaluate(() => {
    return Array.from(document.scripts).map((script, index) => ({
      index: index + 1,
      src: script.src,
      type: script.type,
      loaded: script.readyState === 'complete' || script.readyState === 'loaded'
    }));
  });
  
  console.log('📜 Scripts loaded:', scripts);
  
  // Check if the main script is loaded
  const mainScriptLoaded = scripts.some(script => 
    script.src.includes('main.tsx') || script.src.includes('main.js')
  );
  
  console.log('📜 Main script loaded:', mainScriptLoaded);
  
  // Check if there are any React components rendered
  const reactComponents = await page.evaluate(() => {
    const root = document.getElementById('root');
    return {
      hasReactInstance: root && root._reactInternalInstance,
      rootInnerHTML: root?.innerHTML || '',
      rootOuterHTML: root?.outerHTML || ''
    };
  });
  
  console.log('⚛️ React components check:', reactComponents);
  
  // Check for any error states
  const errorStates = await page.evaluate(() => {
    const errorElements = document.querySelectorAll('[data-testid="error"], .error, [class*="error"]');
    return Array.from(errorElements).map(el => ({
      tagName: el.tagName,
      className: el.className,
      textContent: el.textContent?.substring(0, 100)
    }));
  });
  
  console.log('🚨 Error states found:', errorStates);
  
  // Summary
  console.log('📊 Summary:');
  console.log('- Console messages:', consoleMessages.length);
  console.log('- Page errors:', errors.length);
  console.log('- React loaded:', reactGlobals.hasReact);
  console.log('- ReactDOM loaded:', reactGlobals.hasReactDOM);
  console.log('- Root children:', reactGlobals.rootChildren);
  console.log('- Main script loaded:', mainScriptLoaded);
  console.log('- Has React instance:', reactComponents.hasReactInstance);
  console.log('- Error states:', errorStates.length);
  
  console.log('📱 All console messages:');
  consoleMessages.forEach((msg, index) => {
    console.log(`  ${index + 1}. ${msg}`);
  });
  
  // The app should have React loaded and some content
  expect(reactGlobals.hasReact).toBe(true);
  expect(reactGlobals.hasReactDOM).toBe(true);
  expect(mainScriptLoaded).toBe(true);
}); 