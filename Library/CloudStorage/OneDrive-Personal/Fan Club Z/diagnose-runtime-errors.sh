#!/bin/bash

echo "🔍 Comprehensive Runtime Error Diagnosis"
echo "======================================="

# Create logs directory
mkdir -p logs

# Kill existing processes
echo "🔄 Stopping existing servers..."
pkill -f "vite" 2>/dev/null
pkill -f "tsx watch" 2>/dev/null
sleep 3

# Check dependencies
echo "📦 Checking dependencies..."
cd client
if [ ! -d "node_modules" ]; then
    echo "📦 Installing client dependencies..."
    npm install
fi
cd ../server
if [ ! -d "node_modules" ]; then
    echo "📦 Installing server dependencies..."
    npm install
fi
cd ..

# Start backend with detailed logging
echo "🚀 Starting backend server with detailed logging..."
cd server
npm run dev > ../logs/server-startup.log 2>&1 &
BACKEND_PID=$!
cd ..

# Wait for backend
echo "⏳ Waiting for backend to start..."
sleep 8

# Test backend health
echo "🏥 Testing backend health..."
curl -v http://localhost:3001/health > logs/backend-health.log 2>&1
if [ $? -eq 0 ]; then
    echo "✅ Backend health check passed"
else
    echo "❌ Backend health check failed"
    cat logs/backend-health.log
fi

# Start frontend with detailed logging
echo "🚀 Starting frontend server with detailed logging..."
cd client
npm run dev > ../logs/client-startup.log 2>&1 &
FRONTEND_PID=$!
cd ..

# Wait for frontend
echo "⏳ Waiting for frontend to start..."
sleep 10

# Test frontend HTML
echo "🌐 Testing frontend HTML..."
curl -v http://localhost:3000 > logs/frontend-html.log 2>&1

# Test main.tsx directly
echo "📄 Testing main.tsx access..."
curl -v http://localhost:3000/src/main.tsx > logs/main-tsx-direct.log 2>&1

# Create comprehensive test
echo "🧪 Creating comprehensive browser test..."
cat > logs/comprehensive-test.spec.ts << 'EOF'
import { test, expect } from '@playwright/test';

test('Comprehensive runtime error diagnosis', async ({ page }) => {
  console.log('🔍 Starting comprehensive diagnosis...');
  
  const consoleMessages: string[] = [];
  const errors: string[] = [];
  const networkErrors: string[] = [];
  
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
  
  // Listen for failed requests
  page.on('requestfailed', request => {
    networkErrors.push(`${request.method()} ${request.url()} - ${request.failure()?.errorText || 'Unknown error'}`);
    console.log('🌐 Failed request:', request.url(), request.failure()?.errorText);
  });
  
  await page.goto('http://localhost:3000');
  
  // Wait for page to load
  await page.waitForLoadState('networkidle');
  
  // Wait for potential React initialization
  await page.waitForTimeout(5000);
  
  // Take screenshot
  await page.screenshot({ path: 'logs/runtime-error-diagnosis.png', fullPage: true });
  
  // Check React initialization
  const reactStatus = await page.evaluate(() => {
    return {
      hasReact: typeof window.React !== 'undefined',
      hasReactDOM: typeof window.ReactDOM !== 'undefined',
      documentReadyState: document.readyState,
      hasRootElement: !!document.getElementById('root'),
      rootChildren: document.getElementById('root')?.children?.length || 0,
      rootInnerHTML: document.getElementById('root')?.innerHTML || '',
      scripts: Array.from(document.scripts).map(s => ({
        src: s.src,
        type: s.type,
        readyState: s.readyState
      }))
    };
  });
  
  console.log('🔧 React status:', reactStatus);
  
  // Check for specific error patterns
  const hasBabelError = errors.some(e => e.includes('Unexpected token'));
  const hasImportError = errors.some(e => e.includes('Failed to resolve') || e.includes('Cannot resolve'));
  const hasNetworkError = networkErrors.length > 0;
  
  console.log('📊 Error Analysis:');
  console.log('- Babel parser error:', hasBabelError ? 'YES' : 'NO');
  console.log('- Import resolution error:', hasImportError ? 'YES' : 'NO');
  console.log('- Network errors:', hasNetworkError ? 'YES' : 'NO');
  console.log('- Console messages:', consoleMessages.length);
  console.log('- Page errors:', errors.length);
  console.log('- Failed requests:', networkErrors.length);
  
  // Save detailed logs
  console.log('📱 All console messages:');
  consoleMessages.forEach((msg, i) => console.log(`  ${i+1}. ${msg}`));
  
  console.log('❌ All page errors:');
  errors.forEach((error, i) => console.log(`  ${i+1}. ${error}`));
  
  console.log('🌐 All failed requests:');
  networkErrors.forEach((req, i) => console.log(`  ${i+1}. ${req}`));
  
  // Basic expectations
  expect(reactStatus.hasRootElement).toBe(true);
});
EOF

# Run comprehensive test
echo "🧪 Running comprehensive browser test..."
npx playwright test logs/comprehensive-test.spec.ts --reporter=list

# Generate summary report
echo "📋 Generating summary report..."
cat > logs/diagnosis-summary.md << EOF
# Runtime Error Diagnosis Summary

## Test Results
- **Backend Status**: $(curl -s http://localhost:3001/health > /dev/null && echo "✅ Healthy" || echo "❌ Failed")
- **Frontend Status**: $(curl -s http://localhost:3000 > /dev/null && echo "✅ Serving" || echo "❌ Failed")
- **Main.tsx Access**: $(curl -s http://localhost:3000/src/main.tsx > /dev/null && echo "✅ Accessible" || echo "❌ Failed")

## Log Files Generated
- \`logs/server-startup.log\` - Backend server logs
- \`logs/client-startup.log\` - Frontend server logs
- \`logs/backend-health.log\` - Backend health check
- \`logs/frontend-html.log\` - Frontend HTML response
- \`logs/main-tsx-direct.log\` - Main.tsx direct access
- \`logs/runtime-error-diagnosis.png\` - Browser screenshot

## Next Steps
1. Check \`logs/client-startup.log\` for Vite/Babel errors
2. Check \`logs/runtime-error-diagnosis.png\` for visual state
3. Review browser console errors in the test output above
EOF

# Cleanup
echo "🧹 Cleaning up..."
kill $BACKEND_PID 2>/dev/null
kill $FRONTEND_PID 2>/dev/null

echo ""
echo "📊 Diagnosis Complete!"
echo "===================="
echo "📁 Check the \`logs/\` directory for detailed analysis"
echo "📄 Review \`logs/diagnosis-summary.md\` for summary"
echo "🖼️  View \`logs/runtime-error-diagnosis.png\` for visual state"
echo ""
echo "🎯 Most likely issues:"
echo "1. Babel parser error in a TypeScript file"
echo "2. Import resolution failure for @shared modules"
echo "3. Environment variable configuration issue"
echo "4. Network connectivity to backend API"
