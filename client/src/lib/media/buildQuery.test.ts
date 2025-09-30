// src/lib/media/buildQuery.test.ts
import { describe, it, expect } from 'vitest';
import { buildImageQuery } from './buildQuery';

describe('buildImageQuery', () => {
  describe('Brand Rules', () => {
    it('identifies Apple products correctly (not fruit)', () => {
      const queries = [
        'Will Apple announce a foldable iPhone?',
        'Apple releases new iPad Pro',
        'iOS 18 features leaked',
        'MacBook Air M3 review'
      ];

      queries.forEach(query => {
        const result = buildImageQuery(query, 'tech');
        expect(result).toMatch(/iphone|apple inc/i);
        expect(result).not.toMatch(/fruit/i);
      });
    });

    it('handles Bitcoin/crypto correctly', () => {
      expect(buildImageQuery('Will Bitcoin exceed $100,000?', 'crypto'))
        .toMatch(/bitcoin.*cryptocurrency/i);
      
      expect(buildImageQuery('Ethereum price prediction', 'crypto'))
        .toMatch(/ethereum.*cryptocurrency/i);
      
      expect(buildImageQuery('BTC reaches new ATH', 'crypto'))
        .toMatch(/bitcoin.*cryptocurrency/i);
    });

    it('handles sports correctly', () => {
      expect(buildImageQuery('Who will win the NBA Finals?', 'sports'))
        .toMatch(/basketball.*court/i);
      
      expect(buildImageQuery('NFL Super Bowl prediction', 'sports'))
        .toMatch(/american football.*stadium/i);
      
      expect(buildImageQuery('Premier League winner prediction', 'sports'))
        .toMatch(/soccer.*football/i);
    });

    it('handles finance/central bank topics', () => {
      expect(buildImageQuery('Will the Fed raise interest rates?', 'finance'))
        .toMatch(/central bank.*finance/i);
      
      expect(buildImageQuery('ECB inflation policy', 'finance'))
        .toMatch(/central bank.*finance/i);
    });
  });

  describe('Category Templates', () => {
    it('applies tech category template', () => {
      const result = buildImageQuery('New gadget release', 'tech');
      expect(result).toMatch(/technology|smartphone|gadget/i);
    });

    it('applies crypto category template', () => {
      const result = buildImageQuery('Digital currency adoption', 'crypto');
      expect(result).toMatch(/cryptocurrency|blockchain/i);
    });

    it('applies sports category template', () => {
      const result = buildImageQuery('Championship game prediction', 'sports');
      expect(result).toMatch(/sports|stadium|action/i);
    });

    it('applies politics category template', () => {
      const result = buildImageQuery('Election results prediction', 'politics');
      expect(result).toMatch(/government|politics|podium/i);
    });
  });

  describe('Query Quality', () => {
    it('removes stop words', () => {
      const result = buildImageQuery('Will the new Apple iPhone be released?', 'tech');
      expect(result).not.toMatch(/\b(will|the|be)\b/i);
    });

    it('keeps queries concise (max 6 content words)', () => {
      const longTitle = 'Will the extremely advanced new revolutionary Apple iPhone with amazing features be released soon?';
      const result = buildImageQuery(longTitle, 'tech');
      const words = result.split(' ').filter(w => w.length > 2);
      expect(words.length).toBeLessThanOrEqual(10); // includes category template
    });

    it('normalizes special characters', () => {
      const result = buildImageQuery('Bitcoin price: $100,000?!', 'crypto');
      expect(result).not.toMatch(/[$,!?:]/);
    });

    it('applies synonyms', () => {
      const result = buildImageQuery('BTC price prediction', 'crypto');
      expect(result).toMatch(/bitcoin/i);
    });
  });

  describe('Edge Cases', () => {
    it('handles empty title', () => {
      const result = buildImageQuery('', 'tech');
      expect(result).toBeTruthy();
      expect(result).toMatch(/landscape|modern/i);
    });

    it('handles undefined category', () => {
      const result = buildImageQuery('Will Bitcoin rise?');
      expect(result).toMatch(/bitcoin.*cryptocurrency/i);
    });

    it('handles unknown category', () => {
      const result = buildImageQuery('Random prediction', 'unknown_category');
      expect(result).toMatch(/landscape|modern/i);
    });

    it('handles very short titles', () => {
      const result = buildImageQuery('Apple', 'tech');
      expect(result).toMatch(/apple inc/i);
    });
  });

  describe('Real-World Examples', () => {
    const testCases = [
      {
        title: 'Will Apple announce a foldable iPhone by 2025?',
        category: 'tech',
        expectedMatch: /iphone.*smartphone.*apple/i,
        description: 'Apple iPhone - not fruit'
      },
      {
        title: 'Will Bitcoin exceed $100,000 by end of 2025?',
        category: 'crypto',
        expectedMatch: /bitcoin.*cryptocurrency/i,
        description: 'Bitcoin crypto'
      },
      {
        title: 'Who will win the NBA Finals 2025?',
        category: 'sports',
        expectedMatch: /basketball.*court/i,
        description: 'NBA basketball'
      },
      {
        title: 'Will the Federal Reserve cut interest rates?',
        category: 'finance',
        expectedMatch: /central bank.*finance/i,
        description: 'Fed central bank'
      },
      {
        title: 'Will Ethereum surpass $5000?',
        category: 'crypto',
        expectedMatch: /ethereum.*cryptocurrency/i,
        description: 'Ethereum crypto'
      },
      {
        title: 'Will the Lakers make the playoffs?',
        category: 'sports',
        expectedMatch: /basketball/i,
        description: 'NBA Lakers'
      }
    ];

    testCases.forEach(({ title, category, expectedMatch, description }) => {
      it(`correctly handles: ${description}`, () => {
        const result = buildImageQuery(title, category);
        console.log(`\n${description}:\n  Input: "${title}"\n  Query: "${result}"`);
        expect(result).toMatch(expectedMatch);
      });
    });
  });
});
