#!/usr/bin/env node

// Quick test to verify the date formatting fix
import fetch from 'node-fetch'

const API_BASE_URL = 'http://172.20.3.192:3001/api'

async function quickTest() {
  console.log('🧪 Testing the date formatting fix...')
  console.log('')
  
  try {
    // Login
    const loginResponse = await fetch(`${API_BASE_URL}/users/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'demo@fanclubz.app',
        password: 'demo123'
      })
    })
    
    if (!loginResponse.ok) {
      console.log('❌ Login failed')
      return
    }
    
    const loginData = await loginResponse.json()
    const token = loginData.data.accessToken
    const userId = loginData.data.user.id
    
    console.log('✅ Login successful')
    console.log(`   Balance: $${loginData.data.user.walletBalance}`)
    
    // Get bets
    const betsResponse = await fetch(`${API_BASE_URL}/bets/trending`)
    const betsData = await betsResponse.json()
    
    console.log(`✅ Found ${betsData.data.bets.length} available bets`)
    
    // Test fetching user bet entries instead of placing new bet
    console.log('🔍 Testing bet entries fetch...')
    
    const entriesResponse = await fetch(`${API_BASE_URL}/bet-entries/user/${userId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    
    if (entriesResponse.ok) {
      const entriesData = await entriesResponse.json()
      console.log(`✅ User has ${entriesData.data.betEntries.length} bet entries`)
      
      if (entriesData.data.betEntries.length > 0) {
        console.log('✅ Bet entries are loading correctly!')
        console.log('   Sample entry:', {
          id: entriesData.data.betEntries[0].id,
          betId: entriesData.data.betEntries[0].betId,
          amount: entriesData.data.betEntries[0].amount,
          status: entriesData.data.betEntries[0].status
        })
      }
    } else {
      console.log('❌ Failed to fetch user bet entries')
    }
    
  } catch (error) {
    console.error('💥 Test failed:', error.message)
  }
}

quickTest()
