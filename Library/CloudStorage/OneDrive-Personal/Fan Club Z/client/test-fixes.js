#!/usr/bin/env node

/**
 * Test script to verify all fixes are working correctly
 * Run this after implementing the fixes to ensure everything works
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 Fan Club Z - Testing Fixes Implementation\n');

// Test 1: Check if wallet store updates are present
console.log('1. Testing Wallet Store Updates...');
try {
  const walletStorePath = path.join(__dirname, 'src/store/walletStore.ts');
  const walletStoreContent = fs.readFileSync(walletStorePath, 'utf8');
  
  const checks = [
    'demo_wallet_balance',
    'localStorage.setItem',
    'For demo users, use localStorage persistence'
  ];
  
  let walletStorePass = true;
  checks.forEach(check => {
    if (!walletStoreContent.includes(check)) {
      console.log(`   ❌ Missing: ${check}`);
      walletStorePass = false;
    }
  });
  
  if (walletStorePass) {
    console.log('   ✅ Wallet store updates implemented correctly');
  }
} catch (error) {
  console.log('   ❌ Error checking wallet store:', error.message);
}

// Test 2: Check if auth store updates are present
console.log('\n2. Testing Auth Store Updates...');
try {
  const authStorePath = path.join(__dirname, 'src/store/authStore.ts');
  const authStoreContent = fs.readFileSync(authStorePath, 'utf8');
  
  const checks = [
    'walletBalance: 0',
    'useWalletStore',
    'demo_wallet_balance'
  ];
  
  let authStorePass = true;
  checks.forEach(check => {
    if (!authStoreContent.includes(check)) {
      console.log(`   ❌ Missing: ${check}`);
      authStorePass = false;
    }
  });
  
  if (authStorePass) {
    console.log('   ✅ Auth store updates implemented correctly');
  }
} catch (error) {
  console.log('   ❌ Error checking auth store:', error.message);
}

// Test 3: Check if bet store updates are present
console.log('\n3. Testing Bet Store Updates...');
try {
  const betStorePath = path.join(__dirname, 'src/store/betStore.ts');
  const betStoreContent = fs.readFileSync(betStorePath, 'utf8');
  
  const checks = [
    'demo-user-id',
    'walletStore.deductBalance',
    'walletStore.addBetTransaction'
  ];
  
  let betStorePass = true;
  checks.forEach(check => {
    if (!betStoreContent.includes(check)) {
      console.log(`   ❌ Missing: ${check}`);
      betStorePass = false;
    }
  });
  
  if (betStorePass) {
    console.log('   ✅ Bet store updates implemented correctly');
  }
} catch (error) {
  console.log('   ❌ Error checking bet store:', error.message);
}

// Test 4: Check if BetDetailPage updates are present
console.log('\n4. Testing BetDetailPage Updates...');
try {
  const betDetailPath = path.join(__dirname, 'src/pages/BetDetailPage.tsx');
  const betDetailContent = fs.readFileSync(betDetailPath, 'utf8');
  
  const checks = [
    'bet_like_',
    'bet_comments_',
    'fetchCommentsFromAPI',
    'localStorage.setItem(likeKey'
  ];
  
  let betDetailPass = true;
  checks.forEach(check => {
    if (!betDetailContent.includes(check)) {
      console.log(`   ❌ Missing: ${check}`);
      betDetailPass = false;
    }
  });
  
  if (betDetailPass) {
    console.log('   ✅ BetDetailPage updates implemented correctly');
  }
} catch (error) {
  console.log('   ❌ Error checking BetDetailPage:', error.message);
}

// Test 5: Check if MainHeader updates are present
console.log('\n5. Testing MainHeader Updates...');
try {
  const mainHeaderPath = path.join(__dirname, 'src/components/MainHeader.tsx');
  const mainHeaderContent = fs.readFileSync(mainHeaderPath, 'utf8');
  
  const checks = [
    'refreshBalance(user.id)',
    'hover:bg-gray-100'
  ];
  
  let mainHeaderPass = true;
  checks.forEach(check => {
    if (!mainHeaderContent.includes(check)) {
      console.log(`   ❌ Missing: ${check}`);
      mainHeaderPass = false;
    }
  });
  
  if (mainHeaderPass) {
    console.log('   ✅ MainHeader updates implemented correctly');
  }
} catch (error) {
  console.log('   ❌ Error checking MainHeader:', error.message);
}

// Test 6: Check if TypeScript compiles without errors
console.log('\n6. Testing TypeScript Compilation...');
try {
  execSync('npx tsc --noEmit', { cwd: __dirname, stdio: 'pipe' });
  console.log('   ✅ TypeScript compilation successful');
} catch (error) {
  console.log('   ❌ TypeScript compilation failed');
  console.log('   Error:', error.stdout?.toString() || error.message);
}

console.log('\n🎉 Fix Testing Complete!');
console.log('\n📋 Next Steps:');
console.log('1. Start the development server: npm run dev');
console.log('2. Test the following scenarios:');
console.log('   - Create a new demo account and verify 0 initial balance');
console.log('   - Add funds and verify balance persistence');
console.log('   - Place a bet and verify it appears in My Bets');
console.log('   - Add comments and verify they persist');
console.log('   - Like bets and verify likes persist');
console.log('3. Test with real user accounts for API integration');
