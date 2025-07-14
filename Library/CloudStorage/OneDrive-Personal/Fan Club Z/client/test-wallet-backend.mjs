#!/usr/bin/env node

// Test script to verify the backend wallet endpoint is working
import fetch from 'node-fetch'

const BASE_URL = 'http://127.0.0.1:3001/api'
const DEMO_USER_ID = 'demo-user-id'

async function testWalletBalance() {
  try {
    console.log('🧪 Testing wallet balance endpoint...')
    console.log(`🔗 URL: ${BASE_URL}/wallet/balance/${DEMO_USER_ID}`)
    
    const response = await fetch(`${BASE_URL}/wallet/balance/${DEMO_USER_ID}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })
    
    console.log(`📊 Response status: ${response.status} ${response.statusText}`)
    console.log(`📊 Response headers:`, Object.fromEntries(response.headers.entries()))
    
    if (response.ok) {
      const data = await response.json()
      console.log('✅ Success! Response data:', JSON.stringify(data, null, 2))
    } else {
      const errorText = await response.text()
      console.log('❌ Error response:', errorText)
    }
  } catch (error) {
    console.error('❌ Network error:', error.message)
  }
}

async function testHealth() {
  try {
    console.log('\n🏥 Testing health endpoint...')
    const response = await fetch(`${BASE_URL}/health`)
    
    console.log(`📊 Health status: ${response.status}`)
    
    if (response.ok) {
      const data = await response.json()
      console.log('✅ Backend is healthy!', data)
    } else {
      console.log('❌ Health check failed')
    }
  } catch (error) {
    console.error('❌ Health check error:', error.message)
  }
}

// Run tests
async function runTests() {
  console.log('🚀 Starting backend tests...\n')
  
  await testHealth()
  await testWalletBalance()
  
  console.log('\n✨ Tests completed!')
}

runTests()
