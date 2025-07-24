#!/usr/bin/env node

/**
 * Comprehensive Test for Fan Club Z Services
 * Tests all the fixes we've implemented
 */

const https = require('https');
const http = require('http');

// Disable SSL verification for local testing
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const API_BASE = 'http://localhost:5001/api';
const FRONTEND_URL = 'http://localhost:3000';

console.log('🧪 Testing Fan Club Z Services');
console.log('================================');

async function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https:') ? https : http;
    
    const req = protocol.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({ status: res.statusCode, data: jsonData });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });
    
    req.on('error', reject);
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

async function testBackendHealth() {
  console.log('\n🔍 Testing Backend Health...');
  try {
    const response = await makeRequest(`${API_BASE.replace('/api', '')}/health`);
    if (response.status === 200) {
      console.log('✅ Backend health check passed');
      return true;
    } else {
      console.log('❌ Backend health check failed:', response.status);
      return false;
    }
  } catch (error) {
    console.log('❌ Backend health check error:', error.message);
    return false;
  }
}

async function testWalletBalance() {
  console.log('\n💰 Testing Wallet Balance...');
  try {
    const response = await makeRequest(`${API_BASE}/wallet/balance/demo-user-id`);
    if (response.status === 200 && response.data.success) {
      console.log('✅ Wallet balance working - Demo user has $', response.data.data.balance);
      return true;
    } else {
      console.log('❌ Wallet balance failed:', response.status, response.data);
      return false;
    }
  } catch (error) {
    console.log('❌ Wallet balance error:', error.message);
    return false;
  }
}

async function testCommentsAPI() {
  console.log('\n💬 Testing Comments API...');
  try {
    const betId = '3235f312-e442-4ca1-9fce-dcf9d9b4bce5';
    const response = await makeRequest(`${API_BASE}/bets/${betId}/comments`);
    if (response.status === 200 && response.data.success) {
      console.log('✅ Comments API working - Found', response.data.data.comments.length, 'comments');
      return true;
    } else {
      console.log('❌ Comments API failed:', response.status, response.data);
      return false;
    }
  } catch (error) {
    console.log('❌ Comments API error:', error.message);
    return false;
  }
}

async function testBetPlacement() {
  console.log('\n🎯 Testing Bet Placement...');
  try {
    const betData = {
      betId: '3235f312-e442-4ca1-9fce-dcf9d9b4bce5',
      optionId: 'yes',
      amount: 25,
      userId: 'demo-user-id'
    };
    
    const response = await makeRequest(`${API_BASE}/bet-entries`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(betData)
    });
    
    if (response.status === 201 && response.data.success) {
      console.log('✅ Bet placement working - Created bet entry with ID:', response.data.data.betEntry.id);
      return true;
    } else {
      console.log('❌ Bet placement failed:', response.status, response.data);
      return false;
    }
  } catch (error) {
    console.log('❌ Bet placement error:', error.message);
    return false;
  }
}

async function testFrontend() {
  console.log('\n🌐 Testing Frontend...');
  try {
    const response = await makeRequest(FRONTEND_URL);
    if (response.status === 200 && response.data.includes('Fan Club Z')) {
      console.log('✅ Frontend is running and accessible');
      return true;
    } else {
      console.log('❌ Frontend failed:', response.status);
      return false;
    }
  } catch (error) {
    console.log('❌ Frontend error:', error.message);
    return false;
  }
}

async function testDemoLogin() {
  console.log('\n🔐 Testing Demo Login...');
  try {
    const loginData = {
      email: 'demo@fanclubz.app',
      password: 'demo123'
    };
    
    const response = await makeRequest(`${API_BASE}/users/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(loginData)
    });
    
    if (response.status === 200 && response.data.success) {
      console.log('✅ Demo login working - User ID:', response.data.data.user.id);
      return true;
    } else {
      console.log('❌ Demo login failed:', response.status, response.data);
      return false;
    }
  } catch (error) {
    console.log('❌ Demo login error:', error.message);
    return false;
  }
}

async function runAllTests() {
  const tests = [
    { name: 'Backend Health', fn: testBackendHealth },
    { name: 'Frontend', fn: testFrontend },
    { name: 'Demo Login', fn: testDemoLogin },
    { name: 'Wallet Balance', fn: testWalletBalance },
    { name: 'Comments API', fn: testCommentsAPI },
    { name: 'Bet Placement', fn: testBetPlacement }
  ];
  
  const results = [];
  
  for (const test of tests) {
    const result = await test.fn();
    results.push({ name: test.name, passed: result });
  }
  
  console.log('\n📊 Test Results Summary');
  console.log('========================');
  
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  
  results.forEach(result => {
    const status = result.passed ? '✅' : '❌';
    console.log(`${status} ${result.name}`);
  });
  
  console.log(`\n🎯 Overall: ${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log('🎉 All services are working correctly!');
    console.log('\n🚀 Ready for testing:');
    console.log('   Frontend: http://localhost:3000');
    console.log('   Backend:  http://localhost:5001');
    console.log('   Health:   http://localhost:5001/health');
  } else {
    console.log('⚠️  Some services need attention');
  }
}

// Run the tests
runAllTests().catch(console.error); 