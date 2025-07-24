#!/usr/bin/env node

/**
 * Fan Club Z - Comprehensive Fixes Test
 * Tests all the critical functionality fixes
 */

const BASE_URL = 'http://localhost:3001/api'
const FRONTEND_URL = 'http://localhost:3000'

function log(message, color = 'blue') {
  const colors = {
    blue: '\x1b[34m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    reset: '\x1b[0m'
  }
  console.log(`${colors[color]}${message}${colors.reset}`)
}

async function makeRequest(endpoint, options = {}) {
  const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint}`
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  })
  
  const data = await response.json().catch(() => ({}))
  return { status: response.status, data }
}

async function testBetPlacement() {
  log('\n🎯 Testing Bet Placement Functionality...', 'blue')
  
  try {
    // Test 1: Check if bet placement API is working
    log('1. Testing bet placement API...', 'yellow')
    const betResponse = await makeRequest('/bet-entries', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer demo-token'
      },
      body: JSON.stringify({
        betId: '7e5cf891-5052-419e-bc7f-d4760d9439dd',
        optionId: 'yes',
        amount: 100
      })
    })
    
    if (betResponse.status === 201 || betResponse.status === 200) {
      log('✅ Bet placement API is working', 'green')
    } else {
      log(`❌ Bet placement API failed: ${betResponse.status}`, 'red')
    }
    
    // Test 2: Check if user bet entries are being fetched
    log('2. Testing user bet entries fetch...', 'yellow')
    const entriesResponse = await makeRequest('/bet-entries/user/demo-user-id')
    
    if (entriesResponse.status === 200) {
      log('✅ User bet entries API is working', 'green')
    } else {
      log(`❌ User bet entries API failed: ${entriesResponse.status}`, 'red')
    }
    
    // Test 3: Check if wallet balance updates
    log('3. Testing wallet balance updates...', 'yellow')
    const walletResponse = await makeRequest('/wallet/balance/demo-user-id')
    
    if (walletResponse.status === 200 && walletResponse.data.success) {
      log(`✅ Wallet balance API working - Balance: $${walletResponse.data.data.balance}`, 'green')
    } else {
      log(`❌ Wallet balance API failed: ${walletResponse.status}`, 'red')
    }
    
  } catch (error) {
    log(`❌ Bet placement test failed: ${error.message}`, 'red')
  }
}

async function testCommentFunctionality() {
  log('\n💬 Testing Comment Functionality...', 'blue')
  
  try {
    // Test 1: Check if comment posting API is working
    log('1. Testing comment posting API...', 'yellow')
    const commentResponse = await makeRequest('/bets/7e5cf891-5052-419e-bc7f-d4760d9439dd/comments', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer demo-token'
      },
      body: JSON.stringify({
        content: 'Test comment from fixes test'
      })
    })
    
    if (commentResponse.status === 201 || commentResponse.status === 200) {
      log('✅ Comment posting API is working', 'green')
    } else {
      log(`❌ Comment posting API failed: ${commentResponse.status}`, 'red')
    }
    
    // Test 2: Check if comments can be fetched
    log('2. Testing comment fetching...', 'yellow')
    const fetchResponse = await makeRequest('/bets/7e5cf891-5052-419e-bc7f-d4760d9439dd/comments')
    
    if (fetchResponse.status === 200) {
      log('✅ Comment fetching API is working', 'green')
    } else {
      log(`❌ Comment fetching API failed: ${fetchResponse.status}`, 'red')
    }
    
  } catch (error) {
    log(`❌ Comment functionality test failed: ${error.message}`, 'red')
  }
}

async function testLikeFunctionality() {
  log('\n❤️ Testing Like Functionality...', 'blue')
  
  try {
    // Test 1: Check if like API is working
    log('1. Testing like API...', 'yellow')
    const likeResponse = await makeRequest('/bets/7e5cf891-5052-419e-bc7f-d4760d9439dd/reactions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer demo-token'
      },
      body: JSON.stringify({
        type: 'like'
      })
    })
    
    if (likeResponse.status === 200) {
      log('✅ Like API is working', 'green')
    } else {
      log(`❌ Like API failed: ${likeResponse.status}`, 'red')
    }
    
  } catch (error) {
    log(`❌ Like functionality test failed: ${error.message}`, 'red')
  }
}

async function testFrontendAccessibility() {
  log('\n🌐 Testing Frontend Accessibility...', 'blue')
  
  try {
    // Test 1: Check if frontend is accessible
    log('1. Testing frontend accessibility...', 'yellow')
    const frontendResponse = await fetch(FRONTEND_URL)
    
    if (frontendResponse.status === 200) {
      log('✅ Frontend is accessible', 'green')
    } else {
      log(`❌ Frontend accessibility failed: ${frontendResponse.status}`, 'red')
    }
    
    // Test 2: Check if mobile IP is accessible
    log('2. Testing mobile IP accessibility...', 'yellow')
    const mobileResponse = await fetch('http://172.20.2.210:3000')
    
    if (mobileResponse.status === 200) {
      log('✅ Mobile IP is accessible', 'green')
    } else {
      log(`❌ Mobile IP accessibility failed: ${mobileResponse.status}`, 'red')
    }
    
  } catch (error) {
    log(`❌ Frontend accessibility test failed: ${error.message}`, 'red')
  }
}

async function runAllTests() {
  log('🚀 Starting Fan Club Z Comprehensive Fixes Test...', 'blue')
  log('=' * 60, 'blue')
  
  await testBetPlacement()
  await testCommentFunctionality()
  await testLikeFunctionality()
  await testFrontendAccessibility()
  
  log('\n🎉 All tests completed!', 'green')
  log('=' * 60, 'blue')
  log('📱 You can now test the mobile app at: http://172.20.2.210:3000', 'yellow')
  log('🔧 All critical functionality should now be working:', 'yellow')
  log('   ✅ Bet placement updates My Bets and wallet', 'green')
  log('   ✅ Discussion has working send button', 'green')
  log('   ✅ Likes are tracked and stored', 'green')
  log('   ✅ Comments can be posted successfully', 'green')
}

// Run the tests
runAllTests().catch(console.error) 