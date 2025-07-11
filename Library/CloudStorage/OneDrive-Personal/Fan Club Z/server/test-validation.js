#!/usr/bin/env node

/**
 * Input Validation Test Script
 * Tests the input validation functionality of the API
 */

const BASE_URL = 'http://localhost:5001/api'

async function testValidation() {
  console.log('🧪 Testing Input Validation...\n')
  
  // Test 1: Registration validation
  console.log('📝 Test 1: Registration Validation')
  
  const invalidRegistrationData = {
    firstName: '', // Empty first name
    lastName: 'Doe',
    username: 'a', // Too short username
    email: 'invalid-email', // Invalid email
    phone: '123', // Invalid phone
    dateOfBirth: '2020-01-01', // Under 18
    password: 'weak' // Weak password
  }
  
  try {
    const response = await fetch(`${BASE_URL}/users/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(invalidRegistrationData)
    })
    
    const result = await response.json()
    
    if (response.status === 400 && result.details) {
      console.log('✅ Registration validation working!')
      console.log('Validation errors:')
      result.details.forEach(error => {
        console.log(`   • ${error.field}: ${error.message}`)
      })
    } else {
      console.log('❌ Registration validation failed')
    }
  } catch (error) {
    console.error('❌ Registration test failed:', error.message)
  }
  
  console.log('\n')
  
  // Test 2: Login validation
  console.log('🔐 Test 2: Login Validation')
  
  const invalidLoginData = {
    email: 'invalid-email',
    password: '' // Empty password
  }
  
  try {
    const response = await fetch(`${BASE_URL}/users/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(invalidLoginData)
    })
    
    const result = await response.json()
    
    if (response.status === 400 && result.details) {
      console.log('✅ Login validation working!')
      console.log('Validation errors:')
      result.details.forEach(error => {
        console.log(`   • ${error.field}: ${error.message}`)
      })
    } else {
      console.log('❌ Login validation failed')
    }
  } catch (error) {
    console.error('❌ Login test failed:', error.message)
  }
  
  console.log('\n')
  
  // Test 3: Bet creation validation
  console.log('🎯 Test 3: Bet Creation Validation')
  
  const invalidBetData = {
    title: '', // Empty title
    description: 'A'.repeat(2500), // Too long description
    type: 'invalid_type', // Invalid type
    category: 'invalid_category', // Invalid category
    options: [{ label: 'Option A' }], // Only one option (need at least 2)
    stakeMin: -1, // Negative stake
    stakeMax: 0.5, // Less than min stake
    entryDeadline: '2020-01-01', // Past date
    settlementMethod: 'invalid_method' // Invalid method
  }
  
  try {
    const response = await fetch(`${BASE_URL}/bets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer demo-token'
      },
      body: JSON.stringify(invalidBetData)
    })
    
    const result = await response.json()
    
    if (response.status === 400 && result.details) {
      console.log('✅ Bet creation validation working!')
      console.log('Validation errors:')
      result.details.forEach(error => {
        console.log(`   • ${error.field}: ${error.message}`)
      })
    } else {
      console.log('❌ Bet creation validation failed')
    }
  } catch (error) {
    console.error('❌ Bet creation test failed:', error.message)
  }
  
  console.log('\n')
  
  // Test 4: XSS Protection
  console.log('🛡️ Test 4: XSS Protection')
  
  const xssData = {
    firstName: '<script>alert("xss")</script>',
    lastName: 'Doe',
    username: 'testuser',
    email: 'test@example.com',
    phone: '+1234567890',
    dateOfBirth: '1990-01-01',
    password: 'ValidPass123!'
  }
  
  try {
    const response = await fetch(`${BASE_URL}/users/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(xssData)
    })
    
    const result = await response.json()
    
    if (response.status === 400) {
      console.log('✅ XSS protection working!')
      console.log('XSS blocked:', result.error || 'Validation failed')
    } else if (response.status === 201) {
      console.log('⚠️ XSS protection may not be working - check if script tags were sanitized')
    } else {
      console.log('❌ XSS test failed')
    }
  } catch (error) {
    console.error('❌ XSS test failed:', error.message)
  }
  
  console.log('\n')
  
  // Test 5: Valid data (should pass)
  console.log('✅ Test 5: Valid Data (Should Pass)')
  
  const validRegistrationData = {
    firstName: 'John',
    lastName: 'Doe',
    username: 'johndoe123',
    email: 'john.doe@example.com',
    phone: '+1 (555) 123-4567',
    dateOfBirth: '1990-01-01',
    password: 'ValidPass123!'
  }
  
  try {
    const response = await fetch(`${BASE_URL}/users/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(validRegistrationData)
    })
    
    if (response.status === 201) {
      console.log('✅ Valid data passed validation!')
    } else {
      const result = await response.json()
      console.log('❌ Valid data failed validation:', result.error)
    }
  } catch (error) {
    console.error('❌ Valid data test failed:', error.message)
  }
  
  console.log('\n✅ Input validation tests completed!')
}

// Run the test
testValidation().catch(console.error) 