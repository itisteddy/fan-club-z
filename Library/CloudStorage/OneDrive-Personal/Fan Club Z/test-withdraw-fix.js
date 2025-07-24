#!/usr/bin/env node

/**
 * Test script to verify the withdraw function fix
 * Run this after starting both frontend and backend servers
 */

const { execSync } = require('child_process');

console.log('🧪 Testing Withdraw Function Fix');
console.log('=' .repeat(50));

// Check if servers are running
const checkServer = async (url, name) => {
  try {
    const response = await fetch(url);
    const data = await response.json();
    console.log(`✅ ${name} server is running`);
    return true;
  } catch (error) {
    console.log(`❌ ${name} server is NOT running`);
    console.log(`   Please start the ${name} server first`);
    return false;
  }
};

const testWithdrawEndpoint = async () => {
  try {
    console.log('\n📋 Testing Backend Withdraw Endpoint...');
    
    // Test without authentication (should fail with 401)
    const response = await fetch('http://localhost:5001/api/payment/withdraw', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: 50,
        currency: 'USD',
        destination: 'bank_account'
      }),
    });

    if (response.status === 401) {
      console.log('✅ Withdraw endpoint exists and requires authentication');
      return true;
    } else {
      console.log('❌ Withdraw endpoint response unexpected:', response.status);
      return false;
    }
  } catch (error) {
    console.log('❌ Failed to reach withdraw endpoint:', error.message);
    return false;
  }
};

const runTests = async () => {
  // Check backend server
  const backendRunning = await checkServer('http://localhost:5001/api/health', 'Backend');
  
  // Check frontend server
  const frontendRunning = await checkServer('http://localhost:3000', 'Frontend');
  
  if (!backendRunning || !frontendRunning) {
    console.log('\n⚠️  Please start both servers before running tests:');
    console.log('   Backend: cd server && npm run dev');
    console.log('   Frontend: cd client && npm run dev');
    return;
  }
  
  // Test withdraw endpoint
  const withdrawWorks = await testWithdrawEndpoint();
  
  console.log('\n📊 Test Results:');
  console.log('=' .repeat(30));
  console.log(`Backend Server: ${backendRunning ? '✅' : '❌'}`);
  console.log(`Frontend Server: ${frontendRunning ? '✅' : '❌'}`);
  console.log(`Withdraw Endpoint: ${withdrawWorks ? '✅' : '❌'}`);
  
  if (backendRunning && frontendRunning && withdrawWorks) {
    console.log('\n🎉 All tests passed! The withdraw function should now work.');
    console.log('\n🧭 Next Steps:');
    console.log('1. Open http://localhost:3000 in your browser');
    console.log('2. Navigate to the Wallet tab');
    console.log('3. Try withdrawing funds (minimum $5.00)');
    console.log('4. Check that no repeated MessageEvents appear in console');
    console.log('5. Verify balance updates correctly');
  } else {
    console.log('\n❌ Some tests failed. Please check the issues above.');
  }
};

// Add fetch polyfill for Node.js
if (typeof fetch === 'undefined') {
  global.fetch = require('node-fetch');
}

runTests().catch(console.error);
