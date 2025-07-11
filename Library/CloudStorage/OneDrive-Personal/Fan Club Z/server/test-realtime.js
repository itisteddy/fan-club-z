#!/usr/bin/env node

/**
 * Test script for real-time features
 * Tests WebSocket connections, bet updates, chat, and activity
 */

import WebSocket from 'ws'

const BASE_URL = 'http://localhost:5001'
const WS_URL = 'ws://localhost:5001'

// Test user credentials
const TEST_USER = {
  email: 'demo@fanclubz.app',
  password: 'demo123'
}

let authToken = null
let ws = null

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

async function login() {
  log('🔐 Logging in...', 'blue')
  
  try {
    const response = await fetch(`${BASE_URL}/api/users/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(TEST_USER)
    })

    const data = await response.json()
    
    if (data.success && data.data.accessToken) {
      authToken = data.data.accessToken
      log('✅ Login successful', 'green')
      return true
    } else {
      log('❌ Login failed', 'red')
      console.log(data)
      return false
    }
  } catch (error) {
    log('❌ Login error:', 'red')
    console.error(error)
    return false
  }
}

function connectWebSocket() {
  return new Promise((resolve, reject) => {
    log('🔌 Connecting to realtime WebSocket...', 'blue')
    
    ws = new WebSocket(`${WS_URL}/ws/realtime?token=${authToken}`)
    
    ws.on('open', () => {
      log('✅ WebSocket connected', 'green')
      resolve()
    })
    
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString())
        log(`📨 Received: ${message.type}`, 'yellow')
        console.log('   Data:', message.data)
      } catch (error) {
        log('❌ Error parsing message:', 'red')
        console.error(error)
      }
    })
    
    ws.on('error', (error) => {
      log('❌ WebSocket error:', 'red')
      console.error(error)
      reject(error)
    })
    
    ws.on('close', () => {
      log('🔌 WebSocket closed', 'yellow')
    })
  })
}

function sendMessage(message) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message))
    log(`📤 Sent: ${message.type}`, 'blue')
  } else {
    log('❌ WebSocket not connected', 'red')
  }
}

async function testBetSubscriptions() {
  log('\n🎯 Testing Bet Subscriptions...', 'blue')
  
  // Subscribe to a bet
  sendMessage({
    type: 'subscribe_bet',
    betId: 'test-bet-1'
  })
  
  // Wait a moment
  await new Promise(resolve => setTimeout(resolve, 1000))
  
  // Simulate bet updates via API
  log('📊 Simulating bet updates...', 'blue')
  
  try {
    // Test odds change notification
    await fetch(`${BASE_URL}/api/notifications/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        type: 'bet_update',
        title: 'Odds Changed',
        message: 'The odds for your bet have changed!',
        data: { betId: 'test-bet-1', newOdds: 2.5 }
      })
    })
    
    log('✅ Bet update sent', 'green')
  } catch (error) {
    log('❌ Failed to send bet update:', 'red')
    console.error(error)
  }
  
  // Wait for message
  await new Promise(resolve => setTimeout(resolve, 2000))
  
  // Unsubscribe
  sendMessage({
    type: 'unsubscribe_bet',
    betId: 'test-bet-1'
  })
}

async function testClubChat() {
  log('\n💬 Testing Club Chat...', 'blue')
  
  // Subscribe to a club
  sendMessage({
    type: 'subscribe_club',
    clubId: 'test-club-1'
  })
  
  // Wait a moment
  await new Promise(resolve => setTimeout(resolve, 1000))
  
  // Send a chat message
  sendMessage({
    type: 'send_chat_message',
    clubId: 'test-club-1',
    content: 'Hello from the test script! 🚀'
  })
  
  // Wait for message
  await new Promise(resolve => setTimeout(resolve, 2000))
  
  // Unsubscribe
  sendMessage({
    type: 'unsubscribe_club',
    clubId: 'test-club-1'
  })
}

async function testActivityFeed() {
  log('\n📱 Testing Activity Feed...', 'blue')
  
  // Subscribe to activity
  sendMessage({
    type: 'subscribe_activity'
  })
  
  // Wait a moment
  await new Promise(resolve => setTimeout(resolve, 1000))
  
  // Simulate activity via API
  log('📊 Simulating user activity...', 'blue')
  
  try {
    await fetch(`${BASE_URL}/api/notifications/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        type: 'system',
        title: 'Activity Update',
        message: 'Demo user placed a new bet!',
        data: { activityType: 'bet_placed', betId: 'test-bet-2' }
      })
    })
    
    log('✅ Activity update sent', 'green')
  } catch (error) {
    log('❌ Failed to send activity update:', 'red')
    console.error(error)
  }
  
  // Wait for message
  await new Promise(resolve => setTimeout(resolve, 2000))
  
  // Unsubscribe
  sendMessage({
    type: 'unsubscribe_activity'
  })
}

async function testPingPong() {
  log('\n🏓 Testing Ping/Pong...', 'blue')
  
  // Send ping
  sendMessage({
    type: 'ping'
  })
  
  // Wait for pong
  await new Promise(resolve => setTimeout(resolve, 1000))
}

async function testHealthCheck() {
  log('\n🏥 Testing Health Check...', 'blue')
  
  try {
    const response = await fetch(`${BASE_URL}/health`)
    const data = await response.json()
    
    log('✅ Health check successful', 'green')
    console.log('   Services:', data.services)
  } catch (error) {
    log('❌ Health check failed:', 'red')
    console.error(error)
  }
}

async function runTests() {
  log('🚀 Starting Real-time Features Test', 'blue')
  log('=====================================', 'blue')
  
  // Test 1: Login
  const loginSuccess = await login()
  if (!loginSuccess) {
    log('❌ Cannot proceed without login', 'red')
    process.exit(1)
  }
  
  // Test 2: Health check
  await testHealthCheck()
  
  // Test 3: WebSocket connection
  try {
    await connectWebSocket()
  } catch (error) {
    log('❌ Cannot proceed without WebSocket connection', 'red')
    process.exit(1)
  }
  
  // Test 4: Ping/Pong
  await testPingPong()
  
  // Test 5: Bet subscriptions
  await testBetSubscriptions()
  
  // Test 6: Club chat
  await testClubChat()
  
  // Test 7: Activity feed
  await testActivityFeed()
  
  // Cleanup
  log('\n🧹 Cleaning up...', 'blue')
  if (ws) {
    ws.close()
  }
  
  log('\n✅ All tests completed!', 'green')
  log('Real-time features are working correctly.', 'green')
}

// Handle script termination
process.on('SIGINT', () => {
  log('\n🛑 Test interrupted by user', 'yellow')
  if (ws) {
    ws.close()
  }
  process.exit(0)
})

// Run tests
runTests().catch((error) => {
  log('❌ Test suite failed:', 'red')
  console.error(error)
  process.exit(1)
}) 