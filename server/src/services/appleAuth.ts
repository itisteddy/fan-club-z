/**
 * Sign in with Apple — server-side identity token verification.
 * Validates Apple JWT (iss, aud, exp) and returns stable user identifier + email/name.
 * No tracking; store only sub, email, name per Apple requirements.
 */

import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import config from '../config';

const APPLE_KEYS_URL = 'https://appleid.apple.com/auth/keys';
const APPLE_ISS = 'https://appleid.apple.com';

let cachedKeys: { keys: Array<{ kid: string; n: string; e: string; kty: string }> } | null = null;
let cachedAt = 0;
const CACHE_MS = 60 * 60 * 1000; // 1 hour

async function getAppleKeys(): Promise<{ keys: Array<{ kid: string; n: string; e: string; kty: string }> }> {
  if (cachedKeys && Date.now() - cachedAt < CACHE_MS) return cachedKeys;
  const res = await fetch(APPLE_KEYS_URL);
  if (!res.ok) throw new Error('Failed to fetch Apple JWKS');
  const data = (await res.json()) as { keys: Array<{ kid: string; n: string; e: string; kty: string }> };
  cachedKeys = data;
  cachedAt = Date.now();
  return data;
}

function jwkToPem(jwk: { n: string; e: string; kty: string; alg?: string }): string {
  const key = crypto.createPublicKey({
    key: { kty: jwk.kty, n: jwk.n, e: jwk.e, alg: jwk.alg || 'RS256' },
    format: 'jwk',
  });
  return key.export({ type: 'spki', format: 'pem' }) as string;
}

export interface AppleTokenPayload {
  sub: string;
  email?: string;
  email_verified?: boolean;
  is_private_email?: boolean;
  real_user_status?: number;
  nonce?: string;
  iss: string;
  aud: string;
  exp: number;
  iat: number;
  /** Only on first sign-in */
  name?: string;
}

/**
 * Verify Apple identity token and return payload.
 * Validates signature with Apple JWKS, iss, aud (clientId), exp.
 */
export async function verifyAppleIdentityToken(identityToken: string): Promise<AppleTokenPayload> {
  // Audience validation MUST be enforced to prevent accepting tokens for other apps.
  // Require APPLE_CLIENT_ID (or APPLE_SERVICES_ID fallback) to be configured.
  if (!config.apple.clientId) {
    throw new Error('Apple auth not configured: missing APPLE_CLIENT_ID / APPLE_SERVICES_ID');
  }

  const decoded = jwt.decode(identityToken, { complete: true }) as { header: { kid: string }; payload: AppleTokenPayload } | null;
  if (!decoded?.header?.kid || !decoded?.payload) {
    throw new Error('Invalid Apple identity token');
  }

  const keys = await getAppleKeys();
  const jwk = keys.keys.find((k) => k.kid === decoded.header.kid) as { n: string; e: string; kty: string; alg?: string } | undefined;
  if (!jwk) {
    throw new Error('Apple signing key not found');
  }

  const pem = jwkToPem(jwk);
  const payload = jwt.verify(identityToken, pem, {
    algorithms: ['RS256'],
    issuer: APPLE_ISS,
    audience: config.apple.clientId,
    ignoreExpiration: false,
  }) as AppleTokenPayload;

  if (payload.iss !== APPLE_ISS) {
    throw new Error('Invalid Apple token issuer');
  }
  // jwt.verify already checks "audience", but keep an explicit guard for clarity.
  if (payload.aud !== config.apple.clientId) throw new Error('Invalid Apple token audience');
  return payload;
}
