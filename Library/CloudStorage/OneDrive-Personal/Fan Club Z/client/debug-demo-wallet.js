// Debug script to reset demo wallet balance
// Run this in browser console to reset demo wallet

console.log('🔧 Demo Wallet Debug Script');

// Check current demo balance
const currentBalance = localStorage.getItem('demo_wallet_balance');
console.log('Current demo balance in localStorage:', currentBalance);

// Reset to 2500 (initial demo balance)
localStorage.setItem('demo_wallet_balance', '2500');
console.log('✅ Demo balance reset to 2500');

// Clear other demo data if needed
const keysToCheck = ['demo_wallet_balance'];
keysToCheck.forEach(key => {
  const value = localStorage.getItem(key);
  if (value) {
    console.log(`${key}: ${value}`);
  }
});

// Suggest refresh
console.log('💡 Now refresh the page to see the updated balance');
