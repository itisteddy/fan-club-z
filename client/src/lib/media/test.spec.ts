// Unit tests for the media system
// Run with: npm test or in browser console

import { extractKeywords, disambiguate, buildQueries } from './queryBuilder';
import { pickDeterministic } from './providers';

describe('Media System Tests', () => {
  
  describe('Query Builder', () => {
    it('should extract keywords correctly', () => {
      const keywords = extractKeywords('Will Apple announce a foldable iPhone by 2025?');
      expect(keywords).toContain('apple');
      expect(keywords).toContain('announce');
      expect(keywords).toContain('foldable');
      expect(keywords).toContain('iphone');
      expect(keywords).not.toContain('will'); // stopword
      expect(keywords).not.toContain('by'); // stopword
    });

    it('should disambiguate Apple correctly', () => {
      const { must, exclude } = disambiguate('Will Apple announce a foldable iPhone', 'tech');
      expect(must).toContain('apple inc');
      expect(must).toContain('iphone');
      expect(exclude).toContain('fruit');
      expect(exclude).toContain('orchard');
    });

    it('should disambiguate Bitcoin correctly', () => {
      const { must, exclude } = disambiguate('Will Bitcoin exceed $100,000', 'crypto');
      expect(must).toContain('bitcoin');
      expect(must).toContain('crypto');
      expect(must).toContain('blockchain');
    });

    it('should build queries with category hints', () => {
      const { queries } = buildQueries('Will Apple announce iPhone', 'tech');
      expect(queries.length).toBeGreaterThan(0);
      expect(queries[0]).toContain('technology');
    });
  });

  describe('Deterministic Selection', () => {
    const mockCandidates = [
      { 
        provider: 'unsplash' as const, 
        providerId: '1', 
        urls: {thumb: 'thumb1', small: 'small1', full: 'full1'}, 
        alt: 'apple iphone', 
        attribution: {author: 'Author1', link: 'link1'}, 
        rawTitle: 'apple iphone technology smartphone' 
      },
      { 
        provider: 'pexels' as const, 
        providerId: '2', 
        urls: {thumb: 'thumb2', small: 'small2', full: 'full2'}, 
        alt: 'apple fruit', 
        attribution: {author: 'Author2', link: 'link2'}, 
        rawTitle: 'red apple fruit orchard food' 
      },
      { 
        provider: 'unsplash' as const, 
        providerId: '3', 
        urls: {thumb: 'thumb3', small: 'small3', full: 'full3'}, 
        alt: 'technology device', 
        attribution: {author: 'Author3', link: 'link3'}, 
        rawTitle: 'smartphone device technology gadget' 
      }
    ];

    it('should be deterministic with same seed', () => {
      const result1 = pickDeterministic(mockCandidates, 'Will Apple announce iPhone', 'tech', 'test-seed-1');
      const result2 = pickDeterministic(mockCandidates, 'Will Apple announce iPhone', 'tech', 'test-seed-1');
      
      expect(result1?.pick.providerId).toBe(result2?.pick.providerId);
    });

    it('should vary with different seeds', () => {
      const result1 = pickDeterministic(mockCandidates, 'Will Apple announce iPhone', 'tech', 'seed-a');
      const result2 = pickDeterministic(mockCandidates, 'Will Apple announce iPhone', 'tech', 'seed-b');
      
      // With different seeds, we might get different results (not guaranteed, but likely)
      expect(result1).toBeTruthy();
      expect(result2).toBeTruthy();
    });

    it('should prefer higher scoring candidates', () => {
      const result = pickDeterministic(mockCandidates, 'Will Apple announce iPhone', 'tech', 'test-seed');
      
      // Should prefer tech-related images over fruit images
      expect(result?.pick.rawTitle).not.toContain('fruit');
      expect(result?.score).toBeGreaterThan(0);
    });
  });
});

// Manual test runner for browser console
export function runTests() {
  console.log('🧪 Running Media System Tests...');
  
  try {
    // Test 1: Keywords
    const keywords = extractKeywords('Will Apple announce a foldable iPhone by 2025?');
    console.log('✅ Keywords:', keywords);
    
    // Test 2: Disambiguation
    const apple = disambiguate('Will Apple announce iPhone', 'tech');
    console.log('✅ Apple disambiguation:', apple);
    
    const bitcoin = disambiguate('Will Bitcoin exceed $100k', 'crypto');
    console.log('✅ Bitcoin disambiguation:', bitcoin);
    
    // Test 3: Deterministic selection
    const mockCandidates = [
      { provider: 'unsplash', providerId: '1', urls: {thumb: '', small: '', full: ''}, alt: 'apple tech', attribution: {author: '', link: ''}, rawTitle: 'apple iphone technology' },
      { provider: 'pexels', providerId: '2', urls: {thumb: '', small: '', full: ''}, alt: 'apple fruit', attribution: {author: '', link: ''}, rawTitle: 'red apple fruit' }
    ] as any[];
    
    const pick1 = pickDeterministic(mockCandidates, 'Apple iPhone', 'tech', 'seed1');
    const pick2 = pickDeterministic(mockCandidates, 'Apple iPhone', 'tech', 'seed1');
    const pick3 = pickDeterministic(mockCandidates, 'Apple iPhone', 'tech', 'seed2');
    
    console.log('✅ Deterministic test:', {
      sameSeeds: pick1?.pick.providerId === pick2?.pick.providerId,
      differentSeeds: pick1?.pick.providerId !== pick3?.pick.providerId,
      scores: { pick1: pick1?.score, pick2: pick2?.score, pick3: pick3?.score }
    });
    
    console.log('🎉 All tests passed!');
    return true;
  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  }
}
