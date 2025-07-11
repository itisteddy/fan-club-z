#!/usr/bin/env node

/**
 * Test script for KYC Frontend Integration
 * Tests the API endpoints that the frontend KYC components will use
 */

const BASE_URL = 'http://localhost:5001'

// Test user credentials
const TEST_USER = {
  email: 'john.doe.test@example.com',
  password: 'TestPassword123!'
}

let authToken = null

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

async function loginUser() {
  log('🔐 Logging in with test user...', 'blue')
  
  try {
    const response = await fetch(`${BASE_URL}/api/users/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(TEST_USER),
    })

    const result = await response.json()

    if (result.success) {
      authToken = result.data.accessToken
      log('✅ Login successful', 'green')
      return true
    } else {
      log(`❌ Login failed: ${result.error}`, 'red')
      return false
    }
  } catch (error) {
    log(`❌ Login error: ${error.message}`, 'red')
    return false
  }
}

async function testKYCStatus() {
  log('\n📊 Testing KYC Status API (Frontend endpoint)...', 'blue')
  
  try {
    const response = await fetch(`${BASE_URL}/api/kyc/status`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
    })

    const result = await response.json()

    if (result.success) {
      log('✅ KYC status retrieved successfully', 'green')
      log(`   KYC Level: ${result.data.kycLevel}`, 'yellow')
      log(`   Status: ${result.data.status}`, 'yellow')
      if (result.data.verification) {
        log(`   Verification: ${result.data.verification.status}`, 'yellow')
      }
      if (result.data.documents) {
        log(`   Documents: ${result.data.documents.length}`, 'yellow')
      }
      return true
    } else {
      log(`❌ KYC status failed: ${result.error}`, 'red')
      return false
    }
  } catch (error) {
    log(`❌ KYC status error: ${error.message}`, 'red')
    return false
  }
}

async function testKYCRequirements() {
  log('\n📋 Testing KYC Requirements API (Frontend endpoint)...', 'blue')
  
  try {
    const response = await fetch(`${BASE_URL}/api/kyc/requirements`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
    })

    const result = await response.json()

    if (result.success) {
      log('✅ KYC requirements retrieved successfully', 'green')
      log(`   Required: ${result.data.required}`, 'yellow')
      log(`   Description: ${result.data.description}`, 'yellow')
      log(`   Documents: ${result.data.documents.join(', ')}`, 'yellow')
      return true
    } else {
      log(`❌ KYC requirements failed: ${result.error}`, 'red')
      return false
    }
  } catch (error) {
    log(`❌ KYC requirements error: ${error.message}`, 'red')
    return false
  }
}

async function testKYCSubmission() {
  log('\n📝 Testing KYC Submission API (Frontend endpoint)...', 'blue')
  
  const kycData = {
    firstName: 'John',
    lastName: 'Doe',
    dateOfBirth: '1990-05-15',
    address: {
      street: '123 Test Street',
      city: 'Test City',
      state: 'TS',
      zipCode: '12345',
      country: 'United States'
    },
    phoneNumber: '+1 (555) 987-6543'
  }
  
  try {
    const response = await fetch(`${BASE_URL}/api/kyc/submit`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(kycData),
    })

    const result = await response.json()

    if (result.success) {
      log('✅ KYC submission successful', 'green')
      return true
    } else {
      log(`❌ KYC submission failed: ${result.error}`, 'red')
      return false
    }
  } catch (error) {
    log(`❌ KYC submission error: ${error.message}`, 'red')
    return false
  }
}

async function testDocumentUpload() {
  log('\n📄 Testing Document Upload API (Frontend endpoint)...', 'blue')
  
  const documentData = {
    documentType: 'government_id',
    documentUrl: 'https://example.com/test_document.jpg'
  }
  
  try {
    const response = await fetch(`${BASE_URL}/api/kyc/upload-document`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(documentData),
    })

    const result = await response.json()

    if (result.success) {
      log('✅ Document upload successful', 'green')
      log(`   Document ID: ${result.data.id}`, 'yellow')
      return true
    } else {
      log(`❌ Document upload failed: ${result.error}`, 'red')
      return false
    }
  } catch (error) {
    log(`❌ Document upload error: ${error.message}`, 'red')
    return false
  }
}

async function runTests() {
  log('🚀 Starting KYC Frontend Integration Tests', 'blue')
  log('==================================================', 'blue')
  
  // Test 1: Login
  const loginSuccess = await loginUser()
  if (!loginSuccess) {
    log('❌ Cannot proceed without authentication', 'red')
    return
  }
  
  // Test 2: KYC Status
  await testKYCStatus()
  
  // Test 3: KYC Requirements
  await testKYCRequirements()
  
  // Test 4: KYC Submission (may fail if already submitted)
  await testKYCSubmission()
  
  // Test 5: Document Upload
  await testDocumentUpload()
  
  log('\n✅ KYC Frontend Integration Tests Completed!', 'green')
  log('The frontend KYC components should now work correctly with the backend.', 'yellow')
  log('Open http://localhost:3000 and navigate to the Profile page to test the UI.', 'yellow')
}

// Run the tests
runTests().catch(console.error) 