#!/usr/bin/env node

const BASE_URL = 'http://localhost:5001/api'

async function testSimple() {
  console.log('🔍 Simple Payment Test...\n')
  
  // Get token
  const loginResponse = await fetch(`${BASE_URL}/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'demo@fanclubz.app',
      password: 'demo123'
    })
  })
  
  const loginResult = await loginResponse.json()
  console.log('Login result:', loginResult.success ? '✅' : '❌')
  
  if (!loginResult.success) {
    console.log('Login failed:', loginResult.error)
    return
  }
  
  const token = loginResult.data.accessToken
  console.log('Token obtained:', token ? '✅' : '❌')
  
  // Test withdrawal
  const withdrawResponse = await fetch(`${BASE_URL}/payments/withdraw`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      amount: 50,
      currency: 'USD',
      destination: 'bank'
    })
  })
  
  const withdrawResult = await withdrawResponse.json()
  console.log('Withdrawal result:', withdrawResult.success ? '✅' : '❌')
  console.log('Status:', withdrawResponse.status)
  console.log('Response:', JSON.stringify(withdrawResult, null, 2))
}

testSimple().catch(console.error) 