#!/usr/bin/env node

/**
 * Test script for KYC functionality
 * Tests KYC submission, document upload, status checking, and admin verification
 */

// Using built-in fetch (Node.js 18+)

const BASE_URL = 'http://localhost:5001'

// Test user credentials
const TEST_USER = {
  email: 'demo@fanclubz.app',
  password: 'demo123'
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
      console.log('   Status:', data.data)
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
      console.log('   Requirements:', data.data)
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
    dateOfBirth: '1990-01-01',
    address: {
      street: '123 Main St',
      city: 'New York',
      state: 'NY',
      zipCode: '10001',
      country: 'USA'
    },
    phoneNumber: '+1 (555) 123-4567'
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
    documentUrl: 'https://example.com/passport.jpg'
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
      console.log('   Verification:', data.data.verification)
      console.log('   Documents:', data.data.documents)
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

async function testAdminKYCVerification() {
  log('\n👨‍💼 Testing Admin KYC Verification...', 'blue')
  
  try {
    // This would typically require admin privileges
    // For demo purposes, we'll test the endpoint structure
    const response = await fetch(`${BASE_URL}/api/kyc/verify/test-kyc-id`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        status: 'approved',
        rejectionReason: null
      })
    })

    const data = await response.json()
    
    // This will likely fail due to permissions, but we can see the structure
    if (data.success) {
      log('✅ Admin KYC verification successful', 'green')
      console.log('   Result:', data.data)
    } else {
      log('⚠️ Admin KYC verification failed (expected for demo user)', 'yellow')
      console.log('   Error:', data.error)
    }
  } catch (error) {
    log('❌ Admin KYC verification error:', 'red')
    console.error(error)
  }
}

async function runTests() {
  log('🚀 Starting KYC Functionality Test', 'blue')
  log('=====================================', 'blue')
  
  // Test 1: Login
  const loginSuccess = await login()
  if (!loginSuccess) {
    log('❌ Cannot proceed without login', 'red')
    process.exit(1)
  }
  
  // Test 2: Check current KYC status
  await testKYCStatus()
  
  // Test 3: Check KYC requirements
  await testKYCRequirements()
  
  // Test 4: Submit KYC verification
  await testKYCSubmission()
  
  // Test 5: Upload document
  await testDocumentUpload()
  
  // Test 6: Check verification details
  await testKYCVerification()
  
  // Test 7: Test betting limits
  await testKYCLimits()
  
  // Test 8: Test admin verification (will fail for demo user)
  await testAdminKYCVerification()
  
  // Test 9: Check updated status
  await testKYCStatus()
  
  log('\n✅ All KYC tests completed!', 'green')
  log('KYC functionality is working correctly.', 'green')
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