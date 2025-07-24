#!/usr/bin/env node

// Quick test to verify Unicode errors are fixed
import fetch from 'node-fetch';

async function testUnicodeFix() {
  console.log('🧪 Testing Frontend for Unicode Errors');
  console.log('=====================================\n');
  
  const frontendUrl = 'http://localhost:3000';
  
  try {
    console.log('1️⃣  Testing frontend response...');
    
    const response = await fetch(frontendUrl, { timeout: 5000 });
    const html = await response.text();
    
    if (response.ok) {
      console.log('✅ Frontend is responding (HTTP 200)');
      
      // Check for common error patterns
      if (html.includes('Unicode escape sequence')) {
        console.log('❌ UNICODE ERROR STILL PRESENT');
        console.log('   Error: Unicode escape sequence issue detected');
        return false;
      }
      
      if (html.includes('Expecting Unicode escape sequence')) {
        console.log('❌ UNICODE ERROR STILL PRESENT');
        console.log('   Error: Expecting Unicode escape sequence');
        return false;
      }
      
      if (html.includes('plugin:vite:react-babel')) {
        console.log('❌ BABEL PARSING ERROR DETECTED');
        console.log('   Error: React Babel plugin error');
        return false;
      }
      
      if (html.includes('Failed to parse source')) {
        console.log('❌ PARSING ERROR DETECTED');
        console.log('   Error: Source parsing failed');
        return false;
      }
      
      // Check for successful React app indicators
      if (html.includes('root') && html.includes('script')) {
        console.log('✅ HTML structure looks correct');
        console.log('✅ No Unicode errors detected');
        console.log('✅ Frontend appears to be working');
        return true;
      } else {
        console.log('⚠️  HTML structure unusual, but no Unicode errors');
        return true;
      }
      
    } else {
      console.log(`❌ Frontend returned HTTP ${response.status}`);
      return false;
    }
    
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log('❌ Frontend not running');
      console.log('   Solution: Run ./comprehensive-frontend-fix.sh');
    } else {
      console.log('❌ Error testing frontend:', error.message);
    }
    return false;
  }
}

async function main() {
  const success = await testUnicodeFix();
  
  console.log('\n📊 RESULTS:');
  console.log('============');
  
  if (success) {
    console.log('🎉 SUCCESS: Unicode errors appear to be fixed!');
    console.log('');
    console.log('✅ Next steps:');
    console.log('   1. Open http://localhost:3000 in browser');
    console.log('   2. Check browser console (F12) for any errors');
    console.log('   3. Test user registration and app functionality');
    console.log('   4. Verify all production fixes are still working');
  } else {
    console.log('❌ FAILURE: Issues still detected');
    console.log('');
    console.log('🔧 Troubleshooting:');
    console.log('   1. Ensure frontend is running: ./comprehensive-frontend-fix.sh');
    console.log('   2. Check for additional files with Unicode issues');
    console.log('   3. Clear all caches and restart completely');
    console.log('   4. Check browser console for specific error details');
  }
  
  console.log('');
}

main().catch(console.error);
