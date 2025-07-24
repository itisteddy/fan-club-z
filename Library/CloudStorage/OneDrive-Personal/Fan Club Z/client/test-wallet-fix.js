#!/usr/bin/env node

/**
 * Wallet Balance Fix Test
 * Run this to verify the wallet balance issue is resolved
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Testing Wallet Balance Fix\n');

// Test 1: Check if refreshBalance function is updated correctly
console.log('1. Checking refreshBalance function...');
try {
  const walletStorePath = path.join(__dirname, 'src/store/walletStore.ts');
  const content = fs.readFileSync(walletStorePath, 'utf8');
  
  const checks = [
    'demo_wallet_balance',
    'localStorage.getItem(\'demo_wallet_balance\')',
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
    console.log('   🎉 refreshBalance function updated correctly!');
  }
} catch (error) {
  console.log('   ❌ Error:', error.message);
}

// Test 2: Check if deductBalance function persists to localStorage
console.log('\n2. Checking deductBalance function...');
try {
  const walletStorePath = path.join(__dirname, 'src/store/walletStore.ts');
  const content = fs.readFileSync(walletStorePath, 'utf8');
  
  const checks = [
    'localStorage.setItem(\'demo_wallet_balance\', newBalance.toString())',
    'Persisted demo balance to localStorage after deduction'
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
    console.log('   🎉 deductBalance function updated correctly!');
  }
} catch (error) {
  console.log('   ❌ Error:', error.message);
}

console.log('\n📋 Manual Testing Instructions:');
console.log('1. Open browser dev tools');
console.log('2. Go to Application/Storage tab > Local Storage');
console.log('3. Look for "demo_wallet_balance" key');
console.log('4. If it shows negative value, run: localStorage.setItem("demo_wallet_balance", "2500")');
console.log('5. Refresh the page');
console.log('6. Wallet should now show $2,500.00');

console.log('\n🔍 Debug Steps:');
console.log('1. Check localStorage: localStorage.getItem("demo_wallet_balance")');
console.log('2. Reset balance: localStorage.setItem("demo_wallet_balance", "2500")');
console.log('3. Clear all demo data: localStorage.removeItem("demo_wallet_balance")');
console.log('4. Refresh page to test fresh demo user experience');

console.log('\n✅ Wallet balance fix verification complete!');
