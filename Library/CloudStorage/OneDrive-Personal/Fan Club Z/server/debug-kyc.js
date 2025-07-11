#!/usr/bin/env node

/**
 * Debug script to test KYC database operations directly
 */

import { databaseStorage } from './src/services/databaseStorage.js'

async function debugKYC() {
  console.log('🔍 Debugging KYC Database Operations...')
  
  const testUserId = 'ae28b27a-fe1f-4906-9716-a767499a8299' // Real user from previous test
  
  try {
    // Test 1: Get user
    console.log('\n1. Testing getUserById...')
    const user = await databaseStorage.getUserById(testUserId)
    console.log('User found:', user ? 'Yes' : 'No')
    if (user) {
      console.log('User ID:', user.id)
      console.log('Email:', user.email)
      console.log('KYC Level:', user.kycLevel)
    }
    
    // Test 2: Create KYC verification
    console.log('\n2. Testing createKYCVerification...')
    const kycData = {
      id: 'test-kyc-id-' + Date.now(),
      userId: testUserId,
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
      phoneNumber: '+1 (555) 987-6543',
      status: 'pending',
      submittedAt: new Date().toISOString()
    }
    
    console.log('KYC Data:', JSON.stringify(kycData, null, 2))
    
    const kyc = await databaseStorage.createKYCVerification(kycData)
    console.log('KYC created:', kyc ? 'Yes' : 'No')
    if (kyc) {
      console.log('KYC ID:', kyc.id)
      console.log('User ID:', kyc.userId)
    }
    
    // Test 3: Get KYC by user ID
    console.log('\n3. Testing getKYCByUserId...')
    const retrievedKYC = await databaseStorage.getKYCByUserId(testUserId)
    console.log('KYC retrieved:', retrievedKYC ? 'Yes' : 'No')
    if (retrievedKYC) {
      console.log('KYC ID:', retrievedKYC.id)
      console.log('User ID:', retrievedKYC.userId)
    }
    
    // Test 4: Create KYC document
    console.log('\n4. Testing createKYCDocument...')
    const documentData = {
      id: 'test-doc-id-' + Date.now(),
      userId: testUserId,
      type: 'passport',
      status: 'pending',
      documentUrl: 'https://example.com/test-passport.jpg',
      uploadedAt: new Date().toISOString()
    }
    
    console.log('Document Data:', JSON.stringify(documentData, null, 2))
    
    const document = await databaseStorage.createKYCDocument(documentData)
    console.log('Document created:', document ? 'Yes' : 'No')
    if (document) {
      console.log('Document ID:', document.id)
      console.log('User ID:', document.userId)
    }
    
    // Test 5: Get documents by user ID
    console.log('\n5. Testing getKYCDocumentsByUserId...')
    const documents = await databaseStorage.getKYCDocumentsByUserId(testUserId)
    console.log('Documents found:', documents.length)
    documents.forEach((doc, index) => {
      console.log(`  Document ${index + 1}:`, doc.id, doc.type, doc.userId)
    })
    
  } catch (error) {
    console.error('❌ Debug error:', error)
  }
}

debugKYC().then(() => {
  console.log('\n✅ Debug completed')
  process.exit(0)
}).catch((error) => {
  console.error('❌ Debug failed:', error)
  process.exit(1)
}) 