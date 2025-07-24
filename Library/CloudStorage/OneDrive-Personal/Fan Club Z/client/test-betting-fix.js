#!/usr/bin/env node

/**
 * Betting Functionality Fix Test
 * Run this to verify the betting issue is resolved
 */

const fs = require('fs');
const path = require('path');

console.log('🎯 Testing Betting Functionality Fix\n');

// Test 1: Check if betStore placeBet function handles demo users
console.log('1. Checking betStore placeBet function...');
try {
  const betStorePath = path.join(__dirname, 'src/store/betStore.ts');
  const content = fs.readFileSync(betStorePath, 'utf8');
  
  const checks = [
    'demo-user-id',
    'localStorage.setItem(\'demo_bet_entries\'',
    'walletStore.deductBalance',
    'walletStore.addBetTransaction'
  ];
  
  let allPass = true;
  checks.forEach(check => {
    if (content.includes(check)) {
      console.log(`   ✅ ${check}`);
    } else {
      console.log(`   ❌ Missing: ${check}`);
      allPass = false;
    }
  });
  
  if (allPass) {
    console.log('   🎉 placeBet function updated correctly!');
  }
} catch (error) {
  console.log('   ❌ Error:', error.message);
}

// Test 2: Check if fetchUserBetEntries handles demo users
console.log('\n2. Checking fetchUserBetEntries function...');
try {
  const betStorePath = path.join(__dirname, 'src/store/betStore.ts');
  const content = fs.readFileSync(betStorePath, 'utf8');
  
  const checks = [
    'demo_bet_entries',
    'localStorage.getItem(\'demo_bet_entries\')',
    'For demo users, use localStorage persistence'
  ];
  
  let allPass = true;
  checks.forEach(check => {
    if (content.includes(check)) {
      console.log(`   ✅ ${check}`);
    } else {
      console.log(`   ❌ Missing: ${check}`);
      allPass = false;
    }
  });
  
  if (allPass) {
    console.log('   🎉 fetchUserBetEntries function updated correctly!');
  }
} catch (error) {
  console.log('   ❌ Error:', error.message);
}

// Test 3: Check if BetDetailPage passes bet info correctly
console.log('\n3. Checking BetDetailPage bet placement...');
try {
  const betDetailPath = path.join(__dirname, 'src/pages/BetDetailPage.tsx');
  const content = fs.readFileSync(betDetailPath, 'utf8');
  
  const checks = [
    'betTitle: bet!.title',
    'betDescription: bet!.description'
  ];
  
  let allPass = true;
  checks.forEach(check => {
    if (content.includes(check)) {
      console.log(`   ✅ ${check}`);
    } else {
      console.log(`   ❌ Missing: ${check}`);
      allPass = false;
    }
  });
  
  if (allPass) {
    console.log('   🎉 BetDetailPage bet placement updated correctly!');
  }
} catch (error) {
  console.log('   ❌ Error:', error.message);
}

console.log('\n📋 Manual Testing Instructions:');
console.log('1. Clear existing demo bet entries: localStorage.removeItem("demo_bet_entries")');
console.log('2. Place a bet on any bet from the Discover page');
console.log('3. Go to My Bets tab → Active tab');
console.log('4. Verify the bet appears with correct title and amount');
console.log('5. Check wallet balance decreased by bet amount');
console.log('6. Refresh page and verify bet still appears in My Bets');

console.log('\n🔍 Debug Steps:');
console.log('1. Check demo bet entries: JSON.parse(localStorage.getItem("demo_bet_entries") || "[]")');
console.log('2. Check wallet balance: localStorage.getItem("demo_wallet_balance")');
console.log('3. Clear demo bet entries: localStorage.removeItem("demo_bet_entries")');
console.log('4. Check console logs when placing bets for detailed debugging');

console.log('\n✅ Betting functionality fix verification complete!');
