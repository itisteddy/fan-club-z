#!/usr/bin/env node

/**
 * Comprehensive test for bet creation functionality
 * Tests the entire pipeline from API to database
 */

import { fetch } from 'undici'

const API_BASE = 'http://localhost:3001/api'
const FRONTEND_BASE = 'http://localhost:3000'

console.log('🧪 Fan Club Z - Bet Creation Test Suite')
console.log('======================================')

async function testBackendHealth() {
  console.log('\n📊 Testing backend health...')
  try {
    const response = await fetch(`${API_BASE}/health`)
    const health = await response.json()
    
    if (response.status === 200 && health.success) {
      console.log('✅ Backend is healthy:', health.message)
      return true
    } else {
      console.log('❌ Backend health check failed:', health)
      return false
    }
  } catch (error) {
    console.log('❌ Backend not accessible:', error.message)
    return false
  }
}

async function testFrontendProxy() {
  console.log('\n🌐 Testing frontend proxy...')
  try {
    const response = await fetch(`${FRONTEND_BASE}/api/health`)
    const health = await response.json()
    
    if (response.status === 200 && health.success) {
      console.log('✅ Frontend proxy working:', health.message)
      return true
    } else {
      console.log('❌ Frontend proxy failed:', health)
      return false
    }
  } catch (error) {
    console.log('❌ Frontend proxy not accessible:', error.message)
    return false
  }
}

async function testDemoLogin() {
  console.log('\n🔐 Testing demo login...')
  try {
    const response = await fetch(`${API_BASE}/users/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'fausty@fcz.app',
        password: 'demo123'
      })
    })
    
    const login = await response.json()
    
    if (response.status === 200 && login.success) {
      console.log('✅ Demo login successful')
      console.log('   User:', login.data.user.email)
      console.log('   Balance:', login.data.user.walletBalance)
      return login.data.accessToken
    } else {
      console.log('❌ Demo login failed:', login.error)
      return null
    }
  } catch (error) {
    console.log('❌ Demo login error:', error.message)
    return null
  }
}

async function testBetCreation(token) {
  console.log('\n🎯 Testing bet creation...')
  
  const betData = {
    title: 'Test Bet - Can we create bets successfully?',
    description: 'This is a test bet to verify the creation functionality',
    type: 'binary',
    category: 'custom',
    options: [
      { label: 'Yes' },
      { label: 'No' }
    ],
    stakeMin: 1,
    stakeMax: 100,
    entryDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
    settlementMethod: 'manual',
    isPrivate: false
  }
  
  try {
    const response = await fetch(`${API_BASE}/bets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(betData)
    })
    
    const result = await response.json()
    
    if (response.status === 201 && result.success) {
      console.log('✅ Bet creation successful!')
      console.log('   Bet ID:', result.data.bet.id)
      console.log('   Title:', result.data.bet.title)
      console.log('   Creator:', result.data.bet.creatorId)
      return result.data.bet
    } else {
      console.log('❌ Bet creation failed:', result.error)
      console.log('   Status:', response.status)
      console.log('   Response:', JSON.stringify(result, null, 2))
      return null
    }
  } catch (error) {
    console.log('❌ Bet creation error:', error.message)
    return null
  }
}

async function testBetRetrieval(betId, token) {
  console.log('\n🔍 Testing bet retrieval...')
  
  try {
    const response = await fetch(`${API_BASE}/bets/${betId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    
    const result = await response.json()
    
    if (response.status === 200 && result.success) {
      console.log('✅ Bet retrieval successful!')
      console.log('   Title:', result.data.bet.title)
      console.log('   Status:', result.data.bet.status)
      return true
    } else {
      console.log('❌ Bet retrieval failed:', result.error)
      console.log('   Status:', response.status)
      return false
    }
  } catch (error) {
    console.log('❌ Bet retrieval error:', error.message)
    return false
  }
}

async function testBetListing(token) {
  console.log('\n📋 Testing bet listing...')
  
  try {
    const response = await fetch(`${API_BASE}/bets`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    
    const result = await response.json()
    
    if (response.status === 200 && result.success) {
      console.log('✅ Bet listing successful!')
      console.log('   Total bets:', result.data.bets.length)
      
      // Show latest few bets
      const latest = result.data.bets.slice(0, 3)
      latest.forEach((bet, index) => {
        console.log(`   ${index + 1}. ${bet.title} (${bet.status})`)
      })
      
      return true
    } else {
      console.log('❌ Bet listing failed:', result.error)
      return false
    }
  } catch (error) {
    console.log('❌ Bet listing error:', error.message)
    return false
  }
}

async function runTests() {
  console.log('Starting comprehensive bet creation tests...\n')
  
  let passedTests = 0
  let totalTests = 6
  
  // Test 1: Backend Health
  if (await testBackendHealth()) passedTests++
  
  // Test 2: Frontend Proxy
  if (await testFrontendProxy()) passedTests++
  
  // Test 3: Demo Login
  const token = await testDemoLogin()
  if (token) passedTests++
  
  if (!token) {
    console.log('\n❌ Cannot continue tests without authentication token')
    return
  }
  
  // Test 4: Bet Creation
  const createdBet = await testBetCreation(token)
  if (createdBet) passedTests++
  
  // Test 5: Bet Retrieval
  if (createdBet && await testBetRetrieval(createdBet.id, token)) {
    passedTests++
  }
  
  // Test 6: Bet Listing
  if (await testBetListing(token)) passedTests++
  
  // Results
  console.log('\n' + '='.repeat(50))
  console.log('🧪 TEST RESULTS')
  console.log('='.repeat(50))
  console.log(`✅ Passed: ${passedTests}/${totalTests} tests`)
  console.log(`❌ Failed: ${totalTests - passedTests}/${totalTests} tests`)
  
  if (passedTests === totalTests) {
    console.log('\n🎉 ALL TESTS PASSED! Bet creation is working correctly.')
    console.log('\n📋 Next Steps:')
    console.log('   1. Open http://localhost:3000 in your browser')
    console.log('   2. Login with: fausty@fcz.app / demo123')
    console.log('   3. Navigate to Create tab (+)')
    console.log('   4. Try creating a bet manually')
  } else {
    console.log('\n⚠️  SOME TESTS FAILED. Check the errors above.')
    console.log('\n🔧 Troubleshooting:')
    console.log('   1. Make sure both servers are running:')
    console.log('      - Backend: npm run dev (in server/ directory)')
    console.log('      - Frontend: npm run dev (in client/ directory)')
    console.log('   2. Check if ports 3000 and 3001 are available')
    console.log('   3. Verify database is accessible')
  }
}

// Run the tests
runTests().catch(console.error)
