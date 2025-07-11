#!/usr/bin/env node

/**
 * Test script for improved KYC flow
 * Tests the enhanced error handling and response validation
 */

const API_BASE = 'http://localhost:5001/api'

// Test user data with unique email
const testUser = {
  email: `test-kyc-${Date.now()}@example.com`,
  password: 'TestPassword123!',
  firstName: 'John',
  lastName: 'Doe'
}

// KYC form data
const kycData = {
  firstName: 'John',
  lastName: 'Doe',
  dateOfBirth: '1990-01-01',
  address: {
    street: '123 Test Street',
    city: 'Test City',
    state: 'TS',
    zipCode: '12345',
    country: 'United States'
  },
  phoneNumber: '+1-555-123-4567'
}

let authToken = null

async function makeRequest(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(authToken && { 'Authorization': `Bearer ${authToken}` }),
      ...options.headers
    },
    ...options
  })
  
  const data = await response.json()
  return { response, data }
}

async function testKYCFlow() {
  console.log('🧪 Testing Improved KYC Flow\n')
  
  try {
    // Step 1: Register user
    console.log('1️⃣ Registering test user...')
    const { response: registerResponse, data: registerData } = await makeRequest(`${API_BASE}/users/register`, {
      method: 'POST',
      body: JSON.stringify(testUser)
    })
    
    if (registerData.success) {
      console.log('✅ User registered successfully')
      authToken = registerData.token
    } else {
      console.log('⚠️ User might already exist, trying login...')
      
      // Try to login instead
      const { response: loginResponse, data: loginData } = await makeRequest(`${API_BASE}/users/login`, {
        method: 'POST',
        body: JSON.stringify({
          email: testUser.email,
          password: testUser.password
        })
      })
      
      if (loginData.success) {
        console.log('✅ User logged in successfully')
        authToken = loginData.token
      } else {
        throw new Error(`Login failed: ${loginData.error}`)
      }
    }
    
    // Step 2: Check initial KYC status
    console.log('\n2️⃣ Checking initial KYC status...')
    const { response: statusResponse, data: statusData } = await makeRequest(`${API_BASE}/kyc/status`)
    
    console.log('📊 KYC Status Response:')
    console.log(`   Status: ${statusResponse.status}`)
    console.log(`   Success: ${statusData.success}`)
    console.log(`   Data:`, JSON.stringify(statusData, null, 2))
    
    // Step 3: Submit KYC form
    console.log('\n3️⃣ Submitting KYC form...')
    const { response: submitResponse, data: submitData } = await makeRequest(`${API_BASE}/kyc/submit`, {
      method: 'POST',
      body: JSON.stringify(kycData)
    })
    
    console.log('📝 KYC Submit Response:')
    console.log(`   Status: ${submitResponse.status}`)
    console.log(`   Success: ${submitData.success}`)
    console.log(`   Data:`, JSON.stringify(submitData, null, 2))
    
    if (!submitData.success) {
      console.log('❌ KYC submission failed')
      return
    }
    
    // Step 4: Check KYC status after submission
    console.log('\n4️⃣ Checking KYC status after submission...')
    const { response: statusResponse2, data: statusData2 } = await makeRequest(`${API_BASE}/kyc/status`)
    
    console.log('📊 Updated KYC Status:')
    console.log(`   Status: ${statusResponse2.status}`)
    console.log(`   Success: ${statusData2.success}`)
    console.log(`   Data:`, JSON.stringify(statusData2, null, 2))
    
    // Step 5: Test document upload
    console.log('\n5️⃣ Testing document upload...')
    const { response: uploadResponse, data: uploadData } = await makeRequest(`${API_BASE}/kyc/upload-document`, {
      method: 'POST',
      body: JSON.stringify({
        documentType: 'passport',
        documentUrl: 'https://example.com/test-passport.jpg'
      })
    })
    
    console.log('📎 Document Upload Response:')
    console.log(`   Status: ${uploadResponse.status}`)
    console.log(`   Success: ${uploadData.success}`)
    console.log(`   Data:`, JSON.stringify(uploadData, null, 2))
    
    // Step 6: Final status check
    console.log('\n6️⃣ Final KYC status check...')
    const { response: finalResponse, data: finalData } = await makeRequest(`${API_BASE}/kyc/status`)
    
    console.log('📊 Final KYC Status:')
    console.log(`   Status: ${finalResponse.status}`)
    console.log(`   Success: ${finalData.success}`)
    console.log(`   Data:`, JSON.stringify(finalData, null, 2))
    
    console.log('\n🎉 KYC Flow Test Completed Successfully!')
    
  } catch (error) {
    console.error('❌ Test failed:', error.message)
    console.error('Stack:', error.stack)
  }
}

// Test error handling with invalid requests
async function testErrorHandling() {
  console.log('\n🔍 Testing Error Handling\n')
  
  try {
    // Test 1: Invalid token
    console.log('1️⃣ Testing with invalid token...')
    const { response: invalidTokenResponse, data: invalidTokenData } = await makeRequest(`${API_BASE}/kyc/status`, {
      headers: { 'Authorization': 'Bearer invalid-token' }
    })
    
    console.log('📊 Invalid Token Response:')
    console.log(`   Status: ${invalidTokenResponse.status}`)
    console.log(`   Data:`, JSON.stringify(invalidTokenData, null, 2))
    
    // Test 2: Missing required fields
    console.log('\n2️⃣ Testing with missing required fields...')
    const { response: missingFieldsResponse, data: missingFieldsData } = await makeRequest(`${API_BASE}/kyc/submit`, {
      method: 'POST',
      body: JSON.stringify({ firstName: 'John' }) // Missing other required fields
    })
    
    console.log('📊 Missing Fields Response:')
    console.log(`   Status: ${missingFieldsResponse.status}`)
    console.log(`   Data:`, JSON.stringify(missingFieldsData, null, 2))
    
    // Test 3: Invalid document type
    console.log('\n3️⃣ Testing with invalid document type...')
    const { response: invalidDocResponse, data: invalidDocData } = await makeRequest(`${API_BASE}/kyc/upload-document`, {
      method: 'POST',
      body: JSON.stringify({
        documentType: 'invalid_type',
        documentUrl: 'https://example.com/test.jpg'
      })
    })
    
    console.log('📊 Invalid Document Type Response:')
    console.log(`   Status: ${invalidDocResponse.status}`)
    console.log(`   Data:`, JSON.stringify(invalidDocData, null, 2))
    
    console.log('\n✅ Error Handling Tests Completed!')
    
  } catch (error) {
    console.error('❌ Error handling test failed:', error.message)
  }
}

// Run tests
async function runTests() {
  console.log('🚀 Starting KYC Flow Tests...\n')
  
  await testKYCFlow()
  await testErrorHandling()
  
  console.log('\n🏁 All tests completed!')
}

runTests().catch(console.error) 