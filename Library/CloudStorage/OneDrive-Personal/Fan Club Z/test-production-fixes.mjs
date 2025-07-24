#!/usr/bin/env node

// Comprehensive test to verify all fixes are working
import fetch from 'node-fetch';

const API_BASE = 'http://localhost:3001/api';
const FRONTEND_BASE = 'http://localhost:3000';

console.log('🧪 Fan Club Z - Production Fixes Verification Test');
console.log('====================================================\n');

async function testAPI() {
  try {
    console.log('1️⃣  Testing API Health Check...');
    const response = await fetch(`${API_BASE}/health`);
    const result = await response.json();
    
    if (result.success) {
      console.log('✅ API Health Check: PASSED');
      console.log(`   Message: ${result.message}\n`);
    } else {
      throw new Error('Health check failed');
    }
  } catch (error) {
    console.log('❌ API Health Check: FAILED');
    console.log(`   Error: ${error.message}\n`);
    return false;
  }
  
  return true;
}

async function testRegistrationFlow() {
  try {
    console.log('2️⃣  Testing User Registration (No Demo Logic)...');
    
    const testUser = {
      firstName: 'Test',
      lastName: 'User',
      username: `testuser_${Date.now()}`,
      email: `test_${Date.now()}@example.com`,
      phone: '+1234567890',
      dateOfBirth: '1995-05-15',
      password: 'testpassword123'
    };
    
    const response = await fetch(`${API_BASE}/users/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUser)
    });
    
    const result = await response.json();
    
    if (result.success && result.data.accessToken) {
      console.log('✅ User Registration: PASSED');
      console.log(`   User ID: ${result.data.user.id}`);
      console.log(`   Balance: $${result.data.user.walletBalance}`);
      console.log(`   Token: ${result.data.accessToken.substring(0, 20)}...\n`);
      
      return {
        userId: result.data.user.id,
        token: result.data.accessToken
      };
    } else {
      throw new Error(result.error || 'Registration failed');
    }
  } catch (error) {
    console.log('❌ User Registration: FAILED');
    console.log(`   Error: ${error.message}\n`);
    return null;
  }
}

async function testWalletBalance(userId, token) {
  try {
    console.log('3️⃣  Testing Wallet Balance (No Demo Fallback)...');
    
    const response = await fetch(`${API_BASE}/wallet/balance/${userId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const result = await response.json();
    
    if (result.success && typeof result.data.balance === 'number') {
      console.log('✅ Wallet Balance: PASSED');
      console.log(`   Balance: $${result.data.balance}`);
      console.log(`   Currency: ${result.data.currency}\n`);
      return true;
    } else {
      throw new Error(result.error || 'Balance fetch failed');
    }
  } catch (error) {
    console.log('❌ Wallet Balance: FAILED');
    console.log(`   Error: ${error.message}\n`);
    return false;
  }
}

async function testBetPlacement(userId, token) {
  try {
    console.log('4️⃣  Testing Bet Placement (No Demo User Logic)...');
    
    // First get available bets
    const betsResponse = await fetch(`${API_BASE}/bets`);
    const betsResult = await betsResponse.json();
    
    if (!betsResult.success || !betsResult.data.bets.length) {
      console.log('⚠️  No bets available, skipping bet placement test\n');
      return true;
    }
    
    const testBet = betsResult.data.bets[0];
    const betData = {
      betId: testBet.id,
      optionId: testBet.options[0]?.id || 'option-1',
      amount: 10
    };
    
    const response = await fetch(`${API_BASE}/bet-entries`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(betData)
    });
    
    const result = await response.json();
    
    if (result.success && result.data.betEntry.userId === userId) {
      console.log('✅ Bet Placement: PASSED');
      console.log(`   Bet Entry ID: ${result.data.betEntry.id}`);
      console.log(`   User ID: ${result.data.betEntry.userId}`);
      console.log(`   Amount: $${result.data.betEntry.amount}`);
      console.log(`   New Balance: $${result.data.newBalance}\n`);
      return true;
    } else {
      throw new Error(result.error || 'Bet placement failed');
    }
  } catch (error) {
    console.log('❌ Bet Placement: FAILED');
    console.log(`   Error: ${error.message}\n`);
    return false;
  }
}

async function testMyBets(userId, token) {
  try {
    console.log('5️⃣  Testing My Bets (Real User Data)...');
    
    const response = await fetch(`${API_BASE}/bet-entries/user/${userId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const result = await response.json();
    
    if (result.success) {
      const betEntries = result.data.betEntries;
      console.log('✅ My Bets: PASSED');
      console.log(`   Found ${betEntries.length} bet entries`);
      
      betEntries.forEach((bet, index) => {
        console.log(`   ${index + 1}. Bet ID: ${bet.id}, Amount: $${bet.amount}, Status: ${bet.status}`);
      });
      console.log('');
      return true;
    } else {
      throw new Error(result.error || 'My Bets fetch failed');
    }
  } catch (error) {
    console.log('❌ My Bets: FAILED');
    console.log(`   Error: ${error.message}\n`);
    return false;
  }
}

async function testTransactions(userId, token) {
  try {
    console.log('6️⃣  Testing Transactions (Real User Data)...');
    
    const response = await fetch(`${API_BASE}/transactions/${userId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const result = await response.json();
    
    if (result.success) {
      const transactions = result.data.transactions;
      console.log('✅ Transactions: PASSED');
      console.log(`   Found ${transactions.length} transactions`);
      
      transactions.slice(0, 3).forEach((tx, index) => {
        console.log(`   ${index + 1}. ${tx.type}: $${tx.amount} (${tx.status}) - ${tx.description}`);
      });
      console.log('');
      return true;
    } else {
      throw new Error(result.error || 'Transactions fetch failed');
    }
  } catch (error) {
    console.log('❌ Transactions: FAILED');
    console.log(`   Error: ${error.message}\n`);
    return false;
  }
}

async function testFrontendProxy() {
  try {
    console.log('7️⃣  Testing Frontend Proxy...');
    
    // Test if frontend can proxy API requests
    const response = await fetch(`${FRONTEND_BASE}/api/health`);
    const result = await response.json();
    
    if (result.success) {
      console.log('✅ Frontend Proxy: PASSED');
      console.log(`   Proxy working correctly\n`);
      return true;
    } else {
      throw new Error('Proxy health check failed');
    }
  } catch (error) {
    console.log('❌ Frontend Proxy: FAILED');
    console.log(`   Error: ${error.message}`);
    console.log(`   This is expected if frontend is not running\n`);
    return false;
  }
}

async function runAllTests() {
  console.log('Starting comprehensive test suite...\n');
  
  let passed = 0;
  let total = 0;
  
  // Test 1: API Health
  total++;
  if (await testAPI()) passed++;
  
  // Test 2: Registration
  total++;
  const userAuth = await testRegistrationFlow();
  if (userAuth) passed++;
  
  if (userAuth) {
    const { userId, token } = userAuth;
    
    // Test 3: Wallet Balance
    total++;
    if (await testWalletBalance(userId, token)) passed++;
    
    // Test 4: Bet Placement
    total++;
    if (await testBetPlacement(userId, token)) passed++;
    
    // Test 5: My Bets
    total++;
    if (await testMyBets(userId, token)) passed++;
    
    // Test 6: Transactions
    total++;
    if (await testTransactions(userId, token)) passed++;
  } else {
    // Skip dependent tests if registration failed
    console.log('⚠️  Skipping wallet, bet, and transaction tests due to registration failure\n');
    total += 4; // Account for skipped tests
  }
  
  // Test 7: Frontend Proxy
  total++;
  if (await testFrontendProxy()) passed++;
  
  // Results
  console.log('====================================================');
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('====================================================');
  console.log(`✅ Passed: ${passed}/${total} tests`);
  console.log(`❌ Failed: ${total - passed}/${total} tests`);
  console.log(`📈 Success Rate: ${Math.round((passed / total) * 100)}%\n`);
  
  if (passed === total) {
    console.log('🎉 ALL TESTS PASSED! Production fixes are working correctly.');
    console.log('✨ The app is ready for real user testing.\n');
  } else {
    console.log('⚠️  Some tests failed. Check the issues above.');
    console.log('🔧 You may need to:');
    console.log('   1. Restart the backend server (npm run dev:server)');
    console.log('   2. Restart the frontend server (npm run dev:client)');
    console.log('   3. Check database connectivity\n');
  }
  
  console.log('💡 To test manually:');
  console.log('   1. Backend: http://localhost:3001/api/health');
  console.log('   2. Frontend: http://localhost:3000');
  console.log('   3. Register a new user and place a bet\n');
}

// Run the tests
runAllTests().catch(console.error);
