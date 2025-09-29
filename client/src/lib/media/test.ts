// Test script for the media system
import { buildQueries, extractKeywords, disambiguate } from './queryBuilder';
import { pickDeterministic } from './providers';

// Test query building
console.log('🧪 Testing Query Builder');
console.log('Keywords from "Will Apple announce a foldable iPhone":', extractKeywords('Will Apple announce a foldable iPhone'));
console.log('Disambiguate Apple:', disambiguate('Will Apple announce a foldable iPhone', 'tech'));
console.log('Build queries:', buildQueries('Will Apple announce a foldable iPhone', 'tech'));

// Test Bitcoin disambiguation
console.log('\nBitcoin queries:', buildQueries('Will Bitcoin exceed $100,000', 'crypto'));

// Test deterministic selection
const mockCandidates = [
  { provider: 'unsplash', providerId: '1', urls: {thumb: '', small: '', full: ''}, alt: 'apple iphone', attribution: {author: '', link: ''}, rawTitle: 'apple iphone technology' },
  { mockCandidates: 'unsplash', providerId: '2', urls: {thumb: '', small: '', full: ''}, alt: 'apple fruit', attribution: {author: '', link: ''}, rawTitle: 'red apple fruit orchard' },
  { provider: 'pexels', providerId: '3', urls: {thumb: '', small: '', full: ''}, alt: 'iphone device', attribution: {author: '', link: ''}, rawTitle: 'smartphone device technology' }
] as any[];

console.log('\n🎯 Testing Deterministic Selection');
const result1 = pickDeterministic(mockCandidates, 'Will Apple announce a foldable iPhone', 'tech', 'test-id-1');
const result2 = pickDeterministic(mockCandidates, 'Will Apple announce a foldable iPhone', 'tech', 'test-id-1');
console.log('Same seed should give same result:', result1?.pick.providerId === result2?.pick.providerId);

// Test different seeds
const result3 = pickDeterministic(mockCandidates, 'Will Apple announce a foldable iPhone', 'tech', 'test-id-2');
console.log('Different seeds:', { 
  seed1: result1?.pick.providerId, 
  seed2: result3?.pick.providerId,
  different: result1?.pick.providerId !== result3?.pick.providerId
});

console.log('✅ Media system tests completed');

// To run this test:
// 1. Open browser console
// 2. Import and run: import('./lib/media/test.ts')
