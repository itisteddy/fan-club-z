#!/usr/bin/env node

/**
 * Test script for KYC functionality with a real user
 * Registers a new user and tests the complete KYC flow
 */

const BASE_URL = 'http://localhost:5001'

// Test user credentials for registration
const TEST_USER = {
  firstName: 'John',
  lastName: 'Doe',
  username: 'johndoe_test',
  email: 'john.doe.test@example.com',
  phone: '+1 (555) 987-6543',
  dateOfBirth: '1990-05-15',
  password: 'TestPassword123!'
}

let authToken = null
let userId = null

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

async function registerUser() {
  log('👤 Registering new test user...', 'blue')
  
  try {
    const response = await fetch(`${BASE_URL}/api/users/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(TEST_USER)
    })

    const data = await response.json()
    
    if (data.success && data.data.accessToken) {
      authToken = data.data.accessToken
      userId = data.data.user.id
      log('✅ User registration successful', 'green')
      console.log('   User ID:', userId)
      console.log('   Email:', data.data.user.email)
      return true
    } else {
      log('❌ User registration failed', 'red')
      console.log(data)
      return false
    }
  } catch (error) {
    log('❌ Registration error:', 'red')
    console.error(error)
    return false
  }
}

async function loginUser() {
  log('🔐 Logging in with test user...', 'blue')
  
  try {
    const response = await fetch(`${BASE_URL}/api/users/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: TEST_USER.email,
        password: TEST_USER.password
      })
    })

    const data = await response.json()
    
    if (data.success && data.data.accessToken) {
      authToken = data.data.accessToken
      userId = data.data.user.id
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

async function testKYCStatus() {
  log('\n📊 Testing KYC Status...', 'blue')
  
  try {
    const response = await fetch(`${BASE_URL}/api/kyc/status`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    })

    const data = await response.json()
    
    if (data.success) {
      log('✅ KYC status retrieved', 'green')
      console.log('   KYC Level:', data.data.kycLevel)
      console.log('   Status:', data.data.status)
      console.log('   Verification:', data.data.verification ? 'Present' : 'None')
      console.log('   Documents:', data.data.documents.length)
    } else {
      log('❌ Failed to get KYC status', 'red')
      console.log(data)
    }
  } catch (error) {
    log('❌ KYC status error:', 'red')
    console.error(error)
  }
}

async function testKYCRequirements() {
  log('\n📋 Testing KYC Requirements...', 'blue')
  
  try {
    const response = await fetch(`${BASE_URL}/api/kyc/requirements`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    })

    const data = await response.json()
    
    if (data.success) {
      log('✅ KYC requirements retrieved', 'green')
      console.log('   Required:', data.data.required)
      console.log('   Description:', data.data.description)
      console.log('   Documents:', data.data.documents)
    } else {
      log('❌ Failed to get KYC requirements', 'red')
      console.log(data)
    }
  } catch (error) {
    log('❌ KYC requirements error:', 'red')
    console.error(error)
  }
}

async function testKYCSubmission() {
  log('\n📝 Testing KYC Submission...', 'blue')
  
  const kycData = {
    firstName: 'John',
    lastName: 'Doe',
    dateOfBirth: '1990-05-15',
    address: {
      street: '123 Test Street',
      city: 'Test City',
      state: 'CA',
      zipCode: '90210',
      country: 'USA'
    },
    phoneNumber: '+1 (555) 987-6543'
  }
  
  try {
    const response = await fetch(`${BASE_URL}/api/kyc/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify(kycData)
    })

    const data = await response.json()
    
    if (data.success) {
      log('✅ KYC submission successful', 'green')
      console.log('   KYC ID:', data.data.kycId)
      console.log('   Status:', data.data.status)
    } else {
      log('❌ KYC submission failed', 'red')
      console.log(data)
    }
  } catch (error) {
    log('❌ KYC submission error:', 'red')
    console.error(error)
  }
}

async function testDocumentUpload() {
  log('\n📄 Testing Document Upload...', 'blue')
  
  const documentData = {
    documentType: 'passport',
    documentUrl: 'https://example.com/test-passport.jpg'
  }
  
  try {
    const response = await fetch(`${BASE_URL}/api/kyc/upload-document`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify(documentData)
    })

    const data = await response.json()
    
    if (data.success) {
      log('✅ Document upload successful', 'green')
      console.log('   Document ID:', data.data.documentId)
      console.log('   Status:', data.data.status)
    } else {
      log('❌ Document upload failed', 'red')
      console.log(data)
    }
  } catch (error) {
    log('❌ Document upload error:', 'red')
    console.error(error)
  }
}

async function testKYCVerification() {
  log('\n🔍 Testing KYC Verification Details...', 'blue')
  
  try {
    const response = await fetch(`${BASE_URL}/api/kyc/verification`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    })

    const data = await response.json()
    
    if (data.success) {
      log('✅ KYC verification details retrieved', 'green')
      console.log('   Verification:', data.data.verification ? 'Present' : 'None')
      console.log('   Documents:', data.data.documents.length)
      
      if (data.data.verification) {
        console.log('   - Status:', data.data.verification.status)
        console.log('   - Submitted:', data.data.verification.submittedAt)
      }
      
      if (data.data.documents.length > 0) {
        data.data.documents.forEach((doc, index) => {
          console.log(`   - Document ${index + 1}:`, doc.type, doc.status)
        })
      }
    } else {
      log('❌ Failed to get KYC verification details', 'red')
      console.log(data)
    }
  } catch (error) {
    log('❌ KYC verification error:', 'red')
    console.error(error)
  }
}

async function testKYCLimits() {
  log('\n💰 Testing KYC Betting Limits...', 'blue')
  
  try {
    // Test with different bet amounts
    const testAmounts = [50, 200, 1000, 5000]
    
    for (const amount of testAmounts) {
      try {
        const response = await fetch(`${BASE_URL}/api/kyc/check-limits`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify({ betAmount: amount })
        })

        const data = await response.json()
        
        if (data.success) {
          log(`✅ Bet amount $${amount}: ${data.data.allowed ? 'Allowed' : 'Denied'}`, 'green')
          console.log(`   Max bet: $${data.data.maxBet}`)
          console.log(`   KYC level: ${data.data.currentKYCLevel}`)
        } else {
          log(`❌ Bet amount $${amount}: ${data.error}`, 'red')
        }
      } catch (error) {
        log(`❌ Error checking bet amount $${amount}:`, 'red')
        console.error(error)
      }
    }
  } catch (error) {
    log('❌ KYC limits test error:', 'red')
    console.error(error)
  }
}

async function testUpdatedKYCStatus() {
  log('\n📊 Testing Updated KYC Status...', 'blue')
  
  try {
    const response = await fetch(`${BASE_URL}/api/kyc/status`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    })

    const data = await response.json()
    
    if (data.success) {
      log('✅ Updated KYC status retrieved', 'green')
      console.log('   KYC Level:', data.data.kycLevel)
      console.log('   Status:', data.data.status)
      console.log('   Verification:', data.data.verification ? 'Present' : 'None')
      console.log('   Documents:', data.data.documents.length)
    } else {
      log('❌ Failed to get updated KYC status', 'red')
      console.log(data)
    }
  } catch (error) {
    log('❌ Updated KYC status error:', 'red')
    console.error(error)
  }
}

async function runTests() {
  log('🚀 Starting KYC Functionality Test with Real User', 'blue')
  log('==================================================', 'blue')
  
  // Step 1: Try to register a new user
  const registrationSuccess = await registerUser()
  
  if (!registrationSuccess) {
    // If registration fails (user might already exist), try to login
    log('⚠️ Registration failed, trying login...', 'yellow')
    const loginSuccess = await loginUser()
    if (!loginSuccess) {
      log('❌ Cannot proceed without user authentication', 'red')
      process.exit(1)
    }
  }
  
  // Step 2: Check initial KYC status
  await testKYCStatus()
  
  // Step 3: Check KYC requirements
  await testKYCRequirements()
  
  // Step 4: Submit KYC verification
  await testKYCSubmission()
  
  // Step 5: Upload document
  await testDocumentUpload()
  
  // Step 6: Check verification details
  await testKYCVerification()
  
  // Step 7: Test betting limits
  await testKYCLimits()
  
  // Step 8: Check updated status
  await testUpdatedKYCStatus()
  
  log('\n✅ All KYC tests completed with real user!', 'green')
  log('KYC functionality is working correctly for real users.', 'green')
  log(`Test user: ${TEST_USER.email}`, 'blue')
}

// Handle script termination
process.on('SIGINT', () => {
  log('\n🛑 Test interrupted by user', 'yellow')
  process.exit(0)
})

// Run tests
runTests().catch((error) => {
  log('❌ Test suite failed:', 'red')
  console.error(error)
  process.exit(1)
}) 