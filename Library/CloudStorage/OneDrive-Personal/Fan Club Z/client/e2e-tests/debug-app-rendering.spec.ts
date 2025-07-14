import { test, expect } from '@playwright/test';

test('Debug App component rendering', async ({ page }) => {
  console.log('🔍 Debugging App component rendering...');
  
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
  await page.waitForTimeout(3000);
  
  // Check if the root element has any content
  const rootContent = await page.evaluate(() => {
    const root = document.querySelector('#root');
    if (!root) return 'No root element found';
    
    const children = root.children;
    const childCount = children.length;
    const firstChildHTML = children[0] ? children[0].outerHTML.substring(0, 200) : 'No children';
    
    return {
      childCount,
      firstChildHTML,
      rootInnerHTML: root.innerHTML.substring(0, 500)
    };
  });
  
  console.log('🌳 Root content analysis:', rootContent);
  
  // Check if there are any React error boundaries showing
  const errorBoundaryContent = await page.locator('div:has-text("Something went wrong")').count();
  console.log('🚨 Error boundary content found:', errorBoundaryContent);
  
  // Check if there are any loading states
  const loadingStates = await page.locator('[class*="loading"], [class*="Loading"], [class*="spinner"]').count();
  console.log('⏳ Loading states found:', loadingStates);
  
  // Check if there are any divs with text content
  const divsWithText = await page.evaluate(() => {
    const divs = document.querySelectorAll('div');
    const divsWithContent = Array.from(divs).filter(div => 
      div.textContent && div.textContent.trim().length > 0
    );
    return divsWithContent.map(div => ({
      text: div.textContent?.trim().substring(0, 100),
      className: div.className
    }));
  });
  
  console.log('📦 Divs with text content:', divsWithText.length);
  divsWithText.slice(0, 5).forEach((div, i) => {
    console.log(`  ${i + 1}. "${div.text}" (class: ${div.className})`);
  });
  
  // Take a screenshot
  await page.screenshot({ path: 'debug-app-rendering.png', fullPage: true });
  
  console.log('📊 Summary:');
  console.log('- Console messages:', consoleMessages.length);
  console.log('- Page errors:', errors.length);
  console.log('- Root children:', rootContent.childCount);
  console.log('- Error boundaries:', errorBoundaryContent);
  console.log('- Loading states:', loadingStates);
  console.log('- Divs with text:', divsWithText.length);
  
  // Log all console messages for debugging
  console.log('📱 All console messages:');
  consoleMessages.forEach((msg, i) => {
    console.log(`  ${i + 1}. ${msg}`);
  });
  
  // The page should have some content or show an error boundary
  expect(rootContent.childCount).toBeGreaterThan(0);
}); 