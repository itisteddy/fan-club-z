#!/usr/bin/env node

/**
 * Rate Limiting Test Script
 * Tests the rate limiting functionality of the API
 */

const BASE_URL = 'http://localhost:5001/api'

async function testRateLimit() {
  console.log('🧪 Testing Rate Limiting...\n')
  
  // Test 1: General API rate limiting
  console.log('📊 Test 1: General API Rate Limiting')
  console.log('Making 105 requests to /health (limit: 100 per 15 minutes)...')
  
  let blockedCount = 0
  for (let i = 1; i <= 105; i++) {
    try {
      const response = await fetch(`${BASE_URL}/health`)
      if (response.status === 429) {
        blockedCount++
        if (blockedCount === 1) {
          console.log(`✅ Rate limit triggered at request ${i}`)
          console.log(`Response: ${await response.text()}`)
        }
      }
    } catch (error) {
      console.error(`❌ Request ${i} failed:`, error.message)
    }
  }
  
  console.log(`📈 Results: ${blockedCount} requests were rate limited\n`)
  
  // Test 2: Login rate limiting
  console.log('🔐 Test 2: Login Rate Limiting')
  console.log('Making 5 login attempts (limit: 3 per 15 minutes)...')
  
  let loginBlockedCount = 0
  for (let i = 1; i <= 5; i++) {
    try {
      const response = await fetch(`${BASE_URL}/users/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'wrongpassword'
        })
      })
      
      if (response.status === 429) {
        loginBlockedCount++
        console.log(`✅ Login rate limit triggered at attempt ${i}`)
        console.log(`Response: ${await response.text()}`)
      }
    } catch (error) {
      console.error(`❌ Login attempt ${i} failed:`, error.message)
    }
  }
  
  console.log(`📈 Results: ${loginBlockedCount} login attempts were rate limited\n`)
  
  // Test 3: Bet creation rate limiting
  console.log('🎯 Test 3: Bet Creation Rate Limiting')
  console.log('Making 12 bet creation attempts (limit: 10 per hour)...')
  
  let betBlockedCount = 0
  for (let i = 1; i <= 12; i++) {
    try {
      const response = await fetch(`${BASE_URL}/bets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer demo-token'
        },
        body: JSON.stringify({
          title: `Test Bet ${i}`,
          description: 'Test bet for rate limiting',
          type: 'binary',
          category: 'sports',
          options: [
            { label: 'Option A' },
            { label: 'Option B' }
          ],
          stakeMin: 1,
          stakeMax: 100,
          entryDeadline: new Date(Date.now() + 86400000).toISOString(),
          settlementMethod: 'auto'
        })
      })
      
      if (response.status === 429) {
        betBlockedCount++
        console.log(`✅ Bet creation rate limit triggered at attempt ${i}`)
        console.log(`Response: ${await response.text()}`)
      }
    } catch (error) {
      console.error(`❌ Bet creation attempt ${i} failed:`, error.message)
    }
  }
  
  console.log(`📈 Results: ${betBlockedCount} bet creation attempts were rate limited\n`)
  
  console.log('✅ Rate limiting tests completed!')
  console.log('\n📋 Summary:')
  console.log(`   • General API: ${blockedCount} requests blocked`)
  console.log(`   • Login attempts: ${loginBlockedCount} attempts blocked`)
  console.log(`   • Bet creation: ${betBlockedCount} attempts blocked`)
}

// Run the test
testRateLimit().catch(console.error) 