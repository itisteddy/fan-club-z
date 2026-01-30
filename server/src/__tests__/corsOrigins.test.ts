import { describe, expect, it } from '@jest/globals';
import { restCorsOrigin } from '../config/cors';

/**
 * Regression guard:
 * CORS should never throw and become a 500 for unknown origins.
 * Unknown origins should simply receive no CORS headers (browser blocks it).
 */
describe('CORS origin handling', () => {
  it('returns (err=null, allowed=false) for a blocked origin (no throw)', async () => {
    await new Promise<void>((resolve) => {
      (restCorsOrigin as any)('https://evil.example', (err: any, allowed: boolean) => {
        expect(err).toBeNull();
        expect(allowed).toBe(false);
        resolve();
      });
    });
  });

  it('returns (err=null, allowed=true) for an allowed origin (web admin)', async () => {
    await new Promise<void>((resolve) => {
      (restCorsOrigin as any)('https://web.fanclubz.app', (err: any, allowed: boolean) => {
        expect(err).toBeNull();
        expect(allowed).toBe(true);
        resolve();
      });
    });
  });
});

