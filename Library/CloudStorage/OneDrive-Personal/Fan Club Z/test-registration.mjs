#!/usr/bin/env node

/**
 * Test Registration API
 * Verifies that the registration endpoint is working correctly
 */

const API_BASE = 'http://localhost:3001/api'

async function testRegistration() {
  console.log('🧪 Testing Registration API...')
  console.log('📍 API Base:', API_BASE)
  console.log('')

  try {
    // Test 1: Check if registration endpoint exists
    console.log('1️⃣ Testing registration endpoint availability...')
    const response = await fetch(`${API_BASE}/users/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        firstName: 'John',
        lastName: 'Doe',
        username: 'johndoe123',
        email: 'john@example.com',
        phone: '+1234567890',
        dateOfBirth: '1990-01-01',
        password: 'TestPass123!',
        confirmPassword: 'TestPass123!',
        acceptTerms: true,
        acceptAgeVerification: true
      })
    })

    console.log('📊 Response Status:', response.status)
    console.log('📊 Response Headers:', Object.fromEntries(response.headers.entries()))

    const data = await response.text()
    console.log('📄 Response Body:', data)

    if (response.ok) {
      console.log('✅ Registration endpoint is working!')
      try {
        const jsonData = JSON.parse(data)
        console.log('📋 Response Data:', JSON.stringify(jsonData, null, 2))
      } catch (e) {
        console.log('⚠️  Response is not JSON format')
      }
    } else {
      console.log('❌ Registration endpoint returned error status')
    }

  } catch (error) {
    console.log('❌ Registration test failed:', error.message)
  }

  console.log('')
  console.log('2️⃣ Testing server health...')
  
  try {
    const healthResponse = await fetch(`${API_BASE.replace('/api', '')}/health`)
    const healthData = await healthResponse.json()
    console.log('✅ Server health:', healthData.status)
  } catch (error) {
    console.log('❌ Health check failed:', error.message)
  }

  console.log('')
  console.log('3️⃣ Testing login endpoint...')
  
  try {
    const loginResponse = await fetch(`${API_BASE}/users/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'demo@example.com',
        password: 'demo123'
      })
    })
    
    console.log('📊 Login endpoint status:', loginResponse.status)
    const loginData = await loginResponse.text()
    console.log('📄 Login response:', loginData.substring(0, 200) + '...')
    
  } catch (error) {
    console.log('❌ Login test failed:', error.message)
  }
}

// Run the test
testRegistration().catch(console.error)
