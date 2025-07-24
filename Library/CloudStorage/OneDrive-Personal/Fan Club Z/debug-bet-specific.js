#!/usr/bin/env node

// Debug script to test the specific bet placement API call that's failing
const fetch = require('node-fetch')

const API_BASE_URL = 'http://172.20.3.192:3001/api'

async function debugBetPlacement() {
  console.log('🔍 Debugging the specific bet placement issue...')
  
  try {
    // 1. Login to get token
    console.log('\n1. Logging in...')
    const loginResponse = await fetch(`${API_BASE_URL}/users/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'demo@fanclubz.app',
        password: 'demo123'
      })
    })
    
    if (!loginResponse.ok) {
      const loginError = await loginResponse.text()
      console.error('❌ Login failed:', loginError)
      return
    }
    
    const loginData = await loginResponse.json()
    const token = loginData.data.accessToken
    const userId = loginData.data.user.id
    const balance = loginData.data.user.walletBalance
    
    console.log('✅ Login successful')
    console.log('User ID:', userId)
    console.log('Current balance:', balance)
    
    // 2. Get trending bets
    console.log('\n2. Fetching trending bets...')
    const betsResponse = await fetch(`${API_BASE_URL}/bets/trending`)
    
    if (!betsResponse.ok) {
      console.error('❌ Failed to fetch bets')
      return
    }
    
    const betsData = await betsResponse.json()
    console.log('✅ Found', betsData.data.bets.length, 'bets')
    
    if (betsData.data.bets.length === 0) {
      console.log('❌ No bets available')
      return
    }
    
    const testBet = betsData.data.bets[0]
    console.log('\n📊 Test bet details:')
    console.log('- ID:', testBet.id)
    console.log('- Title:', testBet.title)
    console.log('- Options:', testBet.options)
    
    // 3. Attempt bet placement with detailed logging
    console.log('\n3. Attempting bet placement...')
    
    const betPayload = {
      betId: testBet.id,
      optionId: testBet.options[0].id,
      amount: 10
    }
    
    console.log('📤 Sending bet payload:', JSON.stringify(betPayload, null, 2))
    
    const betResponse = await fetch(`${API_BASE_URL}/bet-entries`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(betPayload)
    })
    
    console.log('📥 Response status:', betResponse.status)
    console.log('📥 Response headers:', Object.fromEntries(betResponse.headers.entries()))
    
    const responseText = await betResponse.text()
    console.log('📥 Raw response:', responseText)
    
    if (!betResponse.ok) {
      console.log('❌ Bet placement failed')
      
      try {
        const errorData = JSON.parse(responseText)
        console.log('💥 Parsed error:', errorData)
      } catch (e) {
        console.log('💥 Raw error text:', responseText)
      }
      
      // 4. Debug the database state
      console.log('\n4. Checking database state...')
      
      // Check if the bet exists in database
      const specificBetResponse = await fetch(`${API_BASE_URL}/bets`)
      if (specificBetResponse.ok) {
        const allBetsData = await specificBetResponse.json()
        const foundBet = allBetsData.data.bets.find(b => b.id === testBet.id)
        if (foundBet) {
          console.log('✅ Bet exists in database')
        } else {
          console.log('❌ Bet NOT found in database!')
          console.log('Available bet IDs:', allBetsData.data.bets.map(b => b.id))
        }
      }
      
      // Check user balance again
      const balanceCheckResponse = await fetch(`${API_BASE_URL}/wallet/balance/${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (balanceCheckResponse.ok) {
        const balanceData = await balanceCheckResponse.json()
        console.log('✅ Current balance:', balanceData.data.balance)
        if (balanceData.data.balance < 10) {
          console.log('❌ Insufficient balance for $10 bet!')
        }
      }
      
    } else {
      console.log('✅ Bet placement successful!')
      
      try {
        const successData = JSON.parse(responseText)
        console.log('🎉 Success response:', successData)
      } catch (e) {
        console.log('✅ Success, but response parsing failed')
      }
    }
    
  } catch (error) {
    console.error('💥 Debugging failed:', error.message)
    console.error('Stack trace:', error.stack)
  }
}

debugBetPlacement()
