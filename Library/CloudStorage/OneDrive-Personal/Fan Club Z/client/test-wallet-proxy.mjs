#!/usr/bin/env node

// Test script to verify the Vite proxy is working
import fetch from 'node-fetch'

const FRONTEND_URL = 'http://172.20.2.210:3000'
const DEMO_USER_ID = 'demo-user-id'

async function testProxyWalletBalance() {
  try {
    console.log('🧪 Testing Vite proxy for wallet balance...')
    console.log(`🔗 URL: ${FRONTEND_URL}/api/wallet/balance/${DEMO_USER_ID}`)
    
    const response = await fetch(`${FRONTEND_URL}/api/wallet/balance/${DEMO_USER_ID}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })
    
    console.log(`📊 Response status: ${response.status} ${response.statusText}`)
    console.log(`📊 Response headers:`, Object.fromEntries(response.headers.entries()))
    
    if (response.ok) {
      const data = await response.json()
      console.log('✅ Proxy working! Response data:', JSON.stringify(data, null, 2))
    } else {
      const errorText = await response.text()
      console.log('❌ Proxy error response:', errorText)
    }
  } catch (error) {
    console.error('❌ Proxy network error:', error.message)
  }
}

async function testProxyHealth() {
  try {
    console.log('\n🏥 Testing proxy health endpoint...')
    const response = await fetch(`${FRONTEND_URL}/api/health`)
    
    console.log(`📊 Health status: ${response.status}`)
    
    if (response.ok) {
      const data = await response.json()
      console.log('✅ Proxy health check passed!', data)
    } else {
      console.log('❌ Proxy health check failed')
    }
  } catch (error) {
    console.error('❌ Proxy health check error:', error.message)
  }
}

// Test direct backend access first
async function testDirectBackend() {
  try {
    console.log('\n🏭 Testing direct backend access...')
    const response = await fetch(`http://127.0.0.1:3001/api/health`)
    
    console.log(`📊 Direct backend status: ${response.status}`)
    
    if (response.ok) {
      const data = await response.json()
      console.log('✅ Direct backend is healthy!', data)
      return true
    } else {
      console.log('❌ Direct backend failed')
      return false
    }
  } catch (error) {
    console.error('❌ Direct backend error:', error.message)
    return false
  }
}

// Run tests
async function runTests() {
  console.log('🚀 Starting proxy tests...\n')
  
  const backendHealthy = await testDirectBackend()
  
  if (!backendHealthy) {
    console.log('\n❌ Backend is not running! Please start the backend first.')
    console.log('   Run: npm run dev:server')
    return
  }
  
  await testProxyHealth()
  await testProxyWalletBalance()
  
  console.log('\n✨ Proxy tests completed!')
}

runTests()
