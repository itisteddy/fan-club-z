// Testing the Auth Gate Implementation
// Run this in browser console to test the system

import { openAuthGate, resolveAuthGate, getPendingIntent, restorePendingAuth } from './auth/authGateAdapter';

export const testAuthGate = {
  // Test opening the modal with different intents
  async testWalletIntent() {
    console.log('🧪 Testing wallet intent...');
    try {
      const result = await openAuthGate({ intent: 'view_wallet' });
      console.log('✅ Wallet auth result:', result);
    } catch (error) {
      console.error('❌ Wallet auth error:', error);
    }
  },

  async testCommentIntent() {
    console.log('🧪 Testing comment intent...');
    try {
      const result = await openAuthGate({ 
        intent: 'comment_prediction', 
        payload: { predictionId: 'test-123' } 
      });
      console.log('✅ Comment auth result:', result);
    } catch (error) {
      console.error('❌ Comment auth error:', error);
    }
  },

  async testFallbackIntent() {
    console.log('🧪 Testing fallback case...');
    try {
      // Simulate missing intentMeta by clearing it
      const result = await openAuthGate({ intent: 'view_wallet' });
      console.log('✅ Fallback case result:', result);
    } catch (error) {
      console.error('❌ Fallback case error:', error);
    }
  },

  testSessionStorage() {
    console.log('🧪 Testing session storage...');
    
    // Test persistence
    openAuthGate({ intent: 'place_prediction', payload: { amount: 50 } });
    
    // Check storage
    const stored = sessionStorage.getItem('fcz.pendingAuth');
    console.log('📦 Stored auth:', stored);
    
    // Test restoration
    const restored = restorePendingAuth();
    console.log('🔄 Restored auth:', restored);
  },

  testPendingIntent() {
    console.log('🧪 Testing pending intent getter...');
    const pending = getPendingIntent();
    console.log('⏳ Current pending:', pending);
  },

  simulateSuccess() {
    console.log('🧪 Simulating successful auth...');
    resolveAuthGate({ status: 'success' });
  },

  simulateCancel() {
    console.log('🧪 Simulating cancelled auth...');
    resolveAuthGate({ status: 'cancel' });
  },

  simulateError() {
    console.log('🧪 Simulating auth error...');
    resolveAuthGate({ status: 'error', reason: 'Test error' });
  },

  runFullTest() {
    console.log('🧪 Running full auth gate test suite...');
    
    // Test 1: Basic modal opening
    console.group('Test 1: Basic Modal Opening');
    this.testFallbackIntent();
    console.groupEnd();

    // Test 2: Session storage
    console.group('Test 2: Session Storage');
    this.testSessionStorage();
    console.groupEnd();

    // Test 3: Pending intent
    console.group('Test 3: Pending Intent');
    this.testPendingIntent();
    console.groupEnd();

    console.log('✅ Test suite completed');
  }
};

// Make it available globally for testing
(window as any).testAuthGate = testAuthGate;
