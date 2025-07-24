#!/usr/bin/env node

// Debug script to test bet placement functionality
import fetch from 'node-fetch'

const API_BASE_URL = 'http://172.20.3.192:3001/api'
// const API_BASE_URL = 'http://localhost:3001/api'

async function testBetPlacement() {
  console.log('🔍 Testing bet placement functionality...')
  
  try {
    // 1. Test API health
    console.log('\n1. Testing API health...')
    const healthResponse = await fetch(`${API_BASE_URL}/health`)
    console.log('Health check status:', healthResponse.status)
    
    if (!healthResponse.ok) {
      console.error('❌ API is not healthy!')
      return
    }
    
    const healthData = await healthResponse.json()
    console.log('✅ API is healthy:', healthData.message)
    
    // 2. Test login to get auth token
    console.log('\n2. Testing login...')
    const loginResponse = await fetch(`${API_BASE_URL}/users/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'demo@fanclubz.app',
        password: 'demo123'
      })
    })
    
    console.log('Login status:', loginResponse.status)
    if (!loginResponse.ok) {
      const loginError = await loginResponse.text()
      console.error('❌ Login failed:', loginError)
      return
    }
    
    const loginData = await loginResponse.json()
    console.log('✅ Login successful')
    
    const token = loginData.data.accessToken
    const userId = loginData.data.user.id
    console.log('User ID:', userId)
    console.log('User Balance:', loginData.data.user.walletBalance)
    
    // 3. Test wallet balance fetch
    console.log('\n3. Testing wallet balance...')
    const balanceResponse = await fetch(`${API_BASE_URL}/wallet/balance/${userId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    
    console.log('Balance fetch status:', balanceResponse.status)
    if (balanceResponse.ok) {
      const balanceData = await balanceResponse.json()
      console.log('✅ Current balance:', balanceData.data.balance)
    } else {
      const balanceError = await balanceResponse.text()
      console.error('❌ Balance fetch failed:', balanceError)
    }
    
    // 4. Test trending bets fetch
    console.log('\n4. Testing trending bets...')
    const betsResponse = await fetch(`${API_BASE_URL}/bets/trending`)
    console.log('Bets fetch status:', betsResponse.status)
    
    if (betsResponse.ok) {
      const betsData = await betsResponse.json()
      console.log('✅ Available bets:', betsData.data.bets.length)
      
      if (betsData.data.bets.length > 0) {
        const testBet = betsData.data.bets[0]
        console.log('Test bet:', testBet.title, 'ID:', testBet.id)
        
        // 5. Test bet placement
        console.log('\n5. Testing bet placement...')
        const betPlacementResponse = await fetch(`${API_BASE_URL}/bet-entries`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            betId: testBet.id,
            optionId: testBet.options[0].id,
            amount: 10
          })
        })
        
        console.log('Bet placement status:', betPlacementResponse.status)
        
        if (betPlacementResponse.ok) {
          const betData = await betPlacementResponse.json()
          console.log('✅ Bet placed successfully!')
          console.log('Bet entry ID:', betData.data.betEntry.id)
          console.log('New balance:', betData.data.newBalance)
        } else {
          const betError = await betPlacementResponse.text()
          console.error('❌ Bet placement failed:')
          console.error('Response:', betError)
          
          // Try to parse as JSON for better error details
          try {
            const errorData = JSON.parse(betError)
            console.error('Error details:', errorData)
          } catch (e) {
            console.error('Raw error:', betError)
          }
        }
      }
    } else {
      const betsError = await betsResponse.text()
      console.error('❌ Bets fetch failed:', betsError)
    }
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message)
  }
}

testBetPlacement()
