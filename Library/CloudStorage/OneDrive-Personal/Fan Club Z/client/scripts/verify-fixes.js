#!/usr/bin/env node

/**
 * Fan Club Z - Fix Verification Script
 * This script verifies that all the fixes we implemented work correctly
 */

import https from 'https';
import http from 'http';

// Configuration
const FRONTEND_URL = 'http://localhost:3000';
const BACKEND_URL = 'http://localhost:5001';

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith('https');
    const client = isHttps ? https : http;
    
    const req = client.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({
            status: res.statusCode,
            data: jsonData,
            headers: res.headers
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: data,
            headers: res.headers
          });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

async function checkBackendHealth() {
  log('🔍 Checking Backend Health...', 'blue');
  try {
    const response = await makeRequest(`${BACKEND_URL}/api/health`);
    if (response.status === 200) {
      log('✅ Backend is running and healthy', 'green');
      return true;
    } else {
      log(`❌ Backend health check failed: ${response.status}`, 'red');
      return false;
    }
  } catch (error) {
    log(`❌ Backend health check failed: ${error.message}`, 'red');
    return false;
  }
}

async function checkTrendingBets() {
  log('🎯 Checking Trending Bets API...', 'blue');
  try {
    const response = await makeRequest(`${BACKEND_URL}/api/bets/trending`);
    if (response.status === 200 && response.data.success && response.data.data?.bets) {
      const bets = response.data.data.bets;
      if (bets.length > 0) {
        log(`✅ Trending bets API working - found ${bets.length} bets`, 'green');
        return true;
      } else {
        log('❌ Trending bets API returned empty bets array', 'red');
        return false;
      }
    } else {
      log(`❌ Trending bets API failed: ${response.status}`, 'red');
      return false;
    }
  } catch (error) {
    log(`❌ Trending bets API failed: ${error.message}`, 'red');
    return false;
  }
}

async function checkBetDetail() {
  log('📊 Checking Bet Detail API...', 'blue');
  try {
    // First get a bet ID from trending bets
    const trendingResponse = await makeRequest(`${BACKEND_URL}/api/bets/trending`);
    if (trendingResponse.status === 200 && trendingResponse.data.success && trendingResponse.data.data?.bets?.length > 0) {
      const betId = trendingResponse.data.data.bets[0].id;
      const response = await makeRequest(`${BACKEND_URL}/api/bets/${betId}`);
      if (response.status === 200 && response.data.success && response.data.data) {
        log('✅ Bet detail API working', 'green');
        return true;
      } else {
        log(`❌ Bet detail API failed: ${response.status}`, 'red');
        return false;
      }
    } else {
      log('❌ Could not get bet ID for detail check', 'red');
      return false;
    }
  } catch (error) {
    log(`❌ Bet detail API failed: ${error.message}`, 'red');
    return false;
  }
}

async function checkComments() {
  log('💬 Checking Comments API...', 'blue');
  try {
    // First get a bet ID from trending bets
    const trendingResponse = await makeRequest(`${BACKEND_URL}/api/bets/trending`);
    if (trendingResponse.status === 200 && trendingResponse.data.success && trendingResponse.data.data?.bets?.length > 0) {
      const betId = trendingResponse.data.data.bets[0].id;
      const response = await makeRequest(`${BACKEND_URL}/api/bets/${betId}/comments`);
      if (response.status === 200 && response.data.success && Array.isArray(response.data.data?.comments)) {
        log(`✅ Comments API working - found ${response.data.data.comments.length} comments`, 'green');
        return true;
      } else {
        log(`❌ Comments API failed: ${response.status}`, 'red');
        return false;
      }
    } else {
      log('❌ Could not get bet ID for comments check', 'red');
      return false;
    }
  } catch (error) {
    log(`❌ Comments API failed: ${error.message}`, 'red');
    return false;
  }
}

async function checkUserBets() {
  log('👤 Checking User Bets API...', 'blue');
  try {
    const response = await makeRequest(`${BACKEND_URL}/api/users/demo-user-id/bets`);
    if (response.status === 200 && response.data.success && Array.isArray(response.data.data?.userBets)) {
      log(`✅ User bets API working - found ${response.data.data.userBets.length} user bets`, 'green');
      return true;
    } else {
      log(`❌ User bets API failed: ${response.status}`, 'red');
      return false;
    }
  } catch (error) {
    log(`❌ User bets API failed: ${error.message}`, 'red');
    return false;
  }
}

async function checkFrontend() {
  log('🌐 Checking Frontend Accessibility...', 'blue');
  try {
    const response = await makeRequest(FRONTEND_URL);
    if (response.status === 200) {
      log('✅ Frontend is accessible', 'green');
      return true;
    } else {
      log(`❌ Frontend check failed: ${response.status}`, 'red');
      return false;
    }
  } catch (error) {
    log(`❌ Frontend check failed: ${error.message}`, 'red');
    return false;
  }
}

async function main() {
  log('🚀 Fan Club Z - Fix Verification Script', 'bold');
  log('=====================================\n', 'bold');

  const results = {
    backendHealth: await checkBackendHealth(),
    trendingBets: await checkTrendingBets(),
    betDetail: await checkBetDetail(),
    comments: await checkComments(),
    userBets: await checkUserBets(),
    frontend: await checkFrontend()
  };

  log('\n📊 Verification Summary', 'bold');
  log('=====================', 'bold');
  log(`${results.backendHealth ? '✅' : '❌'} Backend Health`);
  log(`${results.trendingBets ? '✅' : '❌'} Trending Bets API`);
  log(`${results.betDetail ? '✅' : '❌'} Bet Detail API`);
  log(`${results.comments ? '✅' : '❌'} Comments API`);
  log(`${results.userBets ? '✅' : '❌'} User Bets API`);
  log(`${results.frontend ? '✅' : '❌'} Frontend Accessibility`);

  const passedChecks = Object.values(results).filter(Boolean).length;
  const totalChecks = Object.keys(results).length;

  log(`\n🎯 Results: ${passedChecks}/${totalChecks} checks passed`, passedChecks === totalChecks ? 'green' : 'yellow');

  if (passedChecks === totalChecks) {
    log('\n🎉 All checks passed! The fixes are working correctly.', 'green');
  } else {
    log('\n⚠️  Some checks failed. Please review the issues above.', 'yellow');
  }
}

main().catch(console.error); 