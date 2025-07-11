import { test, expect } from '@playwright/test'

test('debug page content', async ({ page }) => {
  await page.goto('http://localhost:3000')
  
  // Wait for page to load
  await page.waitForLoadState('networkidle')
  
  // Get page title
  const title = await page.title()
  console.log('Page title:', title)
  
  // Get all text content
  const textContent = await page.textContent('body')
  console.log('Page text content:', textContent?.substring(0, 500))
  
  // Check for any errors in console
  const errors: string[] = []
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text())
    }
  })
  
  // Wait a bit for any console errors
  await page.waitForTimeout(2000)
  
  if (errors.length > 0) {
    console.log('Console errors:', errors)
  }
  
  // Take a screenshot
  await page.screenshot({ path: 'debug-screenshot.png', fullPage: true })
  
  // Check if React app is loaded
  const reactRoot = await page.locator('#root').count()
  console.log('React root found:', reactRoot > 0)
  
  // List all buttons on the page
  const buttons = await page.locator('button').allTextContents()
  console.log('Buttons found:', buttons)
})

test('test login page after clearing localStorage', async ({ page }) => {
  // Clear localStorage first
  await page.goto('http://localhost:3000')
  await page.evaluate(() => {
    localStorage.clear()
    sessionStorage.clear()
  })
  
  // Reload the page
  await page.reload()
  await page.waitForLoadState('networkidle')
  
  // Check if login page appears
  const hasWelcomeText = await page.locator('text=Welcome to Fan Club Z').count()
  const hasTryDemoButton = await page.locator('button:has-text("Try Demo")').count()
  const hasSignInButton = await page.locator('button:has-text("Sign in with Email")').count()
  
  console.log('Login page elements found:')
  console.log('- Welcome text:', hasWelcomeText > 0)
  console.log('- Try Demo button:', hasTryDemoButton > 0)
  console.log('- Sign in button:', hasSignInButton > 0)
  
  // Take a screenshot
  await page.screenshot({ path: 'login-page-screenshot.png', fullPage: true })
  
  // Get page content
  const textContent = await page.textContent('body')
  console.log('Page content after clearing localStorage:', textContent?.substring(0, 300))
}) 