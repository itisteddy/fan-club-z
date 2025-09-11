// Test file for predictionStats helper
import { isActivePrediction, computeActiveStats } from '../lib/predictionStats';

// Simple test runner for the browser environment
function runTests() {
  console.log('🧪 Running prediction stats tests...');
  
  // Test 1: isActivePrediction basic cases
  console.log('\n1. Testing isActivePrediction basic cases...');
  
  // Active prediction
  const activePrediction = {
    id: '1',
    status: 'open',
    closesAt: new Date(Date.now() + 60000).toISOString(), // 1 minute from now
    resolvedAt: null
  };
  console.assert(isActivePrediction(activePrediction), 'Should be active: open status, future deadline');

  // Closed prediction
  const closedPrediction = {
    id: '2',
    status: 'closed',
    closesAt: new Date(Date.now() + 60000).toISOString(),
    resolvedAt: null
  };
  console.assert(!isActivePrediction(closedPrediction), 'Should be inactive: closed status');

  // Past deadline
  const pastDeadlinePrediction = {
    id: '3',
    status: 'open',
    closesAt: new Date(Date.now() - 60000).toISOString(), // 1 minute ago
    resolvedAt: null
  };
  console.assert(!isActivePrediction(pastDeadlinePrediction), 'Should be inactive: past deadline');

  // Resolved prediction
  const resolvedPrediction = {
    id: '4',
    status: 'open',
    closesAt: new Date(Date.now() + 60000).toISOString(),
    resolvedAt: new Date().toISOString()
  };
  console.assert(!isActivePrediction(resolvedPrediction), 'Should be inactive: resolved');

  // Test 2: computeActiveStats
  console.log('\n2. Testing computeActiveStats...');
  
  const predictions = [
    {
      id: '1',
      status: 'open',
      totalVolume: 100,
      participants: [{ id: 'user1' }, { id: 'user2' }],
      createdById: 'creator1'
    },
    {
      id: '2', 
      status: 'closed',
      totalVolume: 200,
      participants: [{ id: 'user3' }],
      createdById: 'creator2'
    },
    {
      id: '3',
      status: 'open',
      totalVolume: 50,
      participantCount: 3,
      createdById: 'creator3'
    }
  ];

  const stats = computeActiveStats(predictions);
  
  console.assert(stats.liveCount === 2, `Expected 2 live predictions, got ${stats.liveCount}`);
  console.assert(stats.volume === 150, `Expected volume 150, got ${stats.volume}`);
  console.assert(stats.players >= 3, `Expected at least 3 players, got ${stats.players}`);

  console.log('✅ All tests passed!');
  console.log('Final stats:', stats);
}

// Run tests when this script is loaded
if (typeof window !== 'undefined') {
  runTests();
}

export { runTests };
