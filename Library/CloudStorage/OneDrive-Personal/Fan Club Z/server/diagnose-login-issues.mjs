// Database and Login Diagnostics
// This script tests the core login functionality

import { databaseStorage } from '../src/services/databaseStorage.js';
import bcrypt from 'bcrypt';

async function diagnosticLogin() {
  console.log('🔍 Running Database & Login Diagnostics...\n');
  
  try {
    // Test 1: Check if users table exists and has data
    console.log('1️⃣ Testing database connectivity...');
    const testUser = await databaseStorage.getUserByEmail('test@example.com');
    console.log('   Database query successful');
    
    // Test 2: Try to find the user from the frontend (fausty@fcz.app)
    console.log('\n2️⃣ Testing specific user lookup...');
    const frontendUser = await databaseStorage.getUserByEmail('fausty@fcz.app');
    
    if (frontendUser) {
      console.log('✅ User found:', {
        id: frontendUser.id,
        email: frontendUser.email,
        username: frontendUser.username,
        hasPassword: !!frontendUser.password,
        passwordLength: frontendUser.password?.length || 0
      });
      
      // Test 3: Test password comparison
      console.log('\n3️⃣ Testing password verification...');
      if (frontendUser.password) {
        // Try with a common password
        const passwords = ['demo123', 'password', '123456', 'test'];
        
        for (const testPassword of passwords) {
          try {
            const isValid = await bcrypt.compare(testPassword, frontendUser.password);
            if (isValid) {
              console.log(`✅ Password "${testPassword}" is valid for user`);
              break;
            } else {
              console.log(`❌ Password "${testPassword}" is not valid`);
            }
          } catch (error) {
            console.log(`🔥 Error testing password "${testPassword}":`, error.message);
          }
        }
      } else {
        console.log('❌ No password hash found for user');
      }
    } else {
      console.log('❌ User fausty@fcz.app not found');
      
      // Test 4: Check if ANY users exist
      console.log('\n4️⃣ Checking for any existing users...');
      try {
        // This is a bit hacky but will help us see if there are any users
        const anyUser = await databaseStorage.getUserByEmail('nonexistent@test.com');
        console.log('No users found, or database might be empty');
      } catch (error) {
        console.log('Database error:', error.message);
      }
      
      // Test 5: Create a test user
      console.log('\n5️⃣ Creating a test user...');
      try {
        const hashedPassword = await bcrypt.hash('demo123', 10);
        const newUser = await databaseStorage.createUser({
          email: 'fausty@fcz.app',
          username: 'fausty',
          password: hashedPassword,
          firstName: 'Test',
          lastName: 'User',
          phone: '+1234567890',
          dateOfBirth: '1990-01-01',
          walletAddress: '0x' + Math.random().toString(16).substr(2, 40),
          kycLevel: 'none',
          walletBalance: 500
        });
        
        console.log('✅ Test user created successfully:', {
          id: newUser.id,
          email: newUser.email,
          username: newUser.username
        });
      } catch (error) {
        console.log('❌ Error creating test user:', error.message);
      }
    }
    
  } catch (error) {
    console.log('🔥 Critical error during diagnostics:', error);
    console.log('Error details:', {
      message: error.message,
      stack: error.stack
    });
  }
}

// Run diagnostics
diagnosticLogin().then(() => {
  console.log('\n✅ Diagnostics complete');
  process.exit(0);
}).catch(error => {
  console.log('\n🔥 Diagnostics failed:', error);
  process.exit(1);
});
