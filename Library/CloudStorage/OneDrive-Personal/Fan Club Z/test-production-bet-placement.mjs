#!/usr/bin/env node

/**
 * Test Production Bet Placement Functionality
 * Tests the complete bet placement flow for real users
 */

import https from 'https';
import http from 'http';

// Disable SSL verification for local testing
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const API_BASE = 'http://localhost:5001/api';

console.log('🎯 Testing Production Bet Placement Functionality');
console.log('================================================');

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
        } catch (error) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

async function testProductionBetPlacement() {
  try {
    console.log('\n1️⃣ Testing Backend Direct Access...');
    
    // Test wallet balance for real user
    const balanceResponse = await makeRequest(`${API_BASE}/wallet/balance/test-user-id`);
    console.log('💰 Wallet Balance:', balanceResponse.data);
    
    // Test bet placement for real user
    const betData = {
      betId: '3235f312-e442-4ca1-9fce-dcf9d9b4bce5',
      optionId: 'yes',
      amount: 50
    };
    
    const betResponse = await makeRequest(`${API_BASE}/bet-entries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(betData)
    });
    
    console.log('🎯 Bet Placement Response:', betResponse.data);
    
    // Test user bet entries
    const entriesResponse = await makeRequest(`${API_BASE}/bet-entries/user/test-user-id`);
    console.log('📋 User Bet Entries:', entriesResponse.data);
    
    // Test wallet balance after bet placement
    const newBalanceResponse = await makeRequest(`${API_BASE}/wallet/balance/test-user-id`);
    console.log('💰 New Wallet Balance:', newBalanceResponse.data);
    
    console.log('\n✅ All production tests completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testProductionBetPlacement(); 