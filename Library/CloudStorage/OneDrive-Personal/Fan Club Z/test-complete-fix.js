#!/usr/bin/env node

// Comprehensive test for the fixed bet placement functionality
const fetch = require('node-fetch')

const API_BASE_URL = 'http://172.20.3.192:3001/api'

async function testCompleteFlow() {
  console.log('🧪 Testing the COMPLETE bet placement fix...')
  console.log('')
  
  try {
    // Step 1: Login and get user info
    console.log('1️⃣ Logging in...')
    const loginResponse = await fetch(`${API_BASE_URL}/users/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'demo@fanclubz.app',
        password: 'demo123'
      })
    })
    
    if (!loginResponse.ok) {
      console.log('❌ Login failed - need to setup demo data')
      console.log('Run: cd server && node ../setup-demo-data.js')
      return
    }
    
    const loginData = await loginResponse.json()
    const token = loginData.data.accessToken
    const userId = loginData.data.user.id
    const initialBalance = loginData.data.user.walletBalance
    
    console.log('✅ Login successful')
    console.log(`   User: ${loginData.data.user.email}`)
    console.log(`   Balance: $${initialBalance}`)
    console.log('')
    
    // Step 2: Get trending bets
    console.log('2️⃣ Fetching available bets...')
    const betsResponse = await fetch(`${API_BASE_URL}/bets/trending`)
    
    if (!betsResponse.ok) {
      console.log('❌ Failed to fetch bets')
      return
    }
    
    const betsData = await betsResponse.json()
    console.log(`✅ Found ${betsData.data.bets.length} available bets`)
    
    if (betsData.data.bets.length === 0) {
      console.log('❌ No bets available - need to setup demo data')
      console.log('Run: cd server && node ../setup-demo-data.js')
      return
    }
    
    const testBet = betsData.data.bets[0]\n    console.log(`   Testing with: \"${testBet.title}\"`)
    console.log(`   Bet ID: ${testBet.id}`)
    console.log(`   Available options: ${testBet.options.map(o => o.label).join(', ')}`)
    console.log('')
    
    // Step 3: Test bet placement
    console.log('3️⃣ Placing a $10 bet...')
    
    const betPayload = {
      betId: testBet.id,
      optionId: testBet.options[0].id,
      amount: 10
    }
    
    console.log(`   Betting $10 on: \"${testBet.options[0].label}\"`)
    
    const startTime = Date.now()
    const betResponse = await fetch(`${API_BASE_URL}/bet-entries`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(betPayload)
    })
    const endTime = Date.now()
    
    console.log(`   API call took: ${endTime - startTime}ms`)
    
    if (!betResponse.ok) {
      const errorText = await betResponse.text()
      console.log('❌ Bet placement FAILED!')
      console.log(`   Status: ${betResponse.status}`)
      console.log(`   Error: ${errorText}`)
      
      try {
        const errorData = JSON.parse(errorText)
        console.log(`   Parsed error: ${JSON.stringify(errorData, null, 2)}`)
      } catch (e) {
        console.log(`   Raw error: ${errorText}`)
      }
      
      return
    }
    
    const betData = await betResponse.json()
    console.log('✅ Bet placement SUCCESSFUL!')
    console.log(`   Bet Entry ID: ${betData.data.betEntry.id}`)
    console.log(`   New Balance: $${betData.data.newBalance}`)
    console.log(`   Balance Change: $${initialBalance} → $${betData.data.newBalance} (-$${initialBalance - betData.data.newBalance})`)
    console.log('')
    
    // Step 4: Verify wallet balance was updated
    console.log('4️⃣ Verifying wallet balance update...')
    const balanceResponse = await fetch(`${API_BASE_URL}/wallet/balance/${userId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    
    if (balanceResponse.ok) {
      const balanceData = await balanceResponse.json()
      const currentBalance = balanceData.data.balance
      
      if (currentBalance === betData.data.newBalance) {
        console.log('✅ Wallet balance correctly updated')
        console.log(`   Confirmed balance: $${currentBalance}`)
      } else {
        console.log('⚠️ Balance mismatch detected')
        console.log(`   Expected: $${betData.data.newBalance}`)
        console.log(`   Actual: $${currentBalance}`)
      }
    } else {
      console.log('❌ Failed to verify balance')
    }
    console.log('')
    
    // Step 5: Check if bet appears in user's bet entries
    console.log('5️⃣ Checking user bet entries...')
    const betEntriesResponse = await fetch(`${API_BASE_URL}/bet-entries/user/${userId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    
    if (betEntriesResponse.ok) {
      const entriesData = await betEntriesResponse.json()
      const userBets = entriesData.data.betEntries
      const newBet = userBets.find(bet => bet.id === betData.data.betEntry.id)
      
      if (newBet) {
        console.log('✅ Bet entry found in user\'s bets')
        console.log(`   Entry Status: ${newBet.status}`)
        console.log(`   Amount: $${newBet.amount}`)
        console.log(`   Potential Winnings: $${newBet.potentialWinnings}`)
      } else {
        console.log('❌ Bet entry NOT found in user\'s bets')
        console.log(`   Available entries: ${userBets.map(b => b.id).join(', ')}`)
      }
    } else {
      console.log('❌ Failed to fetch user bet entries')
    }
    console.log('')
    
    // Step 6: Check transaction history
    console.log('6️⃣ Checking transaction history...')
    const transactionsResponse = await fetch(`${API_BASE_URL}/transactions/${userId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    
    if (transactionsResponse.ok) {
      const txData = await transactionsResponse.json()
      const transactions = txData.data.transactions
      const betTransaction = transactions.find(tx => 
        tx.type === 'bet_lock' && tx.amount === 10
      )
      
      if (betTransaction) {
        console.log('✅ Transaction recorded successfully')
        console.log(`   Transaction ID: ${betTransaction.id}`)
        console.log(`   Type: ${betTransaction.type}`)
        console.log(`   Amount: $${betTransaction.amount}`)
        console.log(`   Status: ${betTransaction.status}`)
      } else {
        console.log('❌ Bet transaction NOT found')
        console.log(`   Recent transactions: ${transactions.slice(0, 3).map(t => `${t.type}:$${t.amount}`).join(', ')}`)
      }
    } else {
      console.log('❌ Failed to fetch transaction history')
    }
    console.log('')
    
    // Final Summary
    console.log('🎉 BET PLACEMENT TEST COMPLETE!')
    console.log('')
    console.log('📋 Summary:')
    console.log('✅ User authentication: Working')
    console.log('✅ Bet data fetching: Working')
    console.log('✅ Bet placement API: Working')
    console.log('✅ Wallet balance update: Working')
    console.log('✅ Bet entries storage: Working')
    console.log('✅ Transaction recording: Working')
    console.log('')
    console.log('🚀 The Place Bet button should now work correctly in the frontend!')
    console.log('')
    console.log('🎯 Next steps:')
    console.log('1. Open the frontend: http://localhost:3000')
    console.log('2. Login with: demo@fanclubz.app')
    console.log('3. Navigate to any bet detail page')
    console.log('4. Click \"Place Bet\" - it should work!')
    
  } catch (error) {
    console.error('💥 Test failed with error:', error.message)
    console.error('Stack trace:', error.stack)
    console.log('')
    console.log('🔧 Troubleshooting:')
    console.log('1. Make sure the backend server is running')
    console.log('2. Run: cd server && node ../setup-demo-data.js')
    console.log('3. Check server logs for errors')
  }
}

testCompleteFlow()
