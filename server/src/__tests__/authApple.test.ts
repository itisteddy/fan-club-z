/**
 * Minimal tests for POST /api/v2/auth/apple (Phase 2).
 * Token verification is mocked; we assert validation and error paths.
 */
import { describe, expect, it, jest, beforeEach } from '@jest/globals';

jest.mock('../services/appleAuth', () => ({
  verifyAppleIdentityToken: jest.fn(),
}));

import request from 'supertest';
import express from 'express';
import { authRouter } from '../routes/auth';
import * as appleAuth from '../services/appleAuth';

const app = express();
app.use(express.json());
app.use('/api/v2/auth', authRouter);

describe('POST /api/v2/auth/apple', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 400 when identityToken is missing', async () => {
    const res = await request(app)
      .post('/api/v2/auth/apple')
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Bad Request');
    expect(appleAuth.verifyAppleIdentityToken).not.toHaveBeenCalled();
  });

  it('returns 401 when token verification throws', async () => {
    const mockVerify = appleAuth.verifyAppleIdentityToken as jest.MockedFunction<typeof appleAuth.verifyAppleIdentityToken>;
    mockVerify.mockRejectedValueOnce(new Error('Invalid token'));
    const res = await request(app)
      .post('/api/v2/auth/apple')
      .send({ identityToken: 'invalid.jwt.here' });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Unauthorized');
    expect(mockVerify).toHaveBeenCalledWith('invalid.jwt.here');
  });

  it('returns 200 and claims when token is valid (mocked)', async () => {
    const mockVerify = appleAuth.verifyAppleIdentityToken as jest.MockedFunction<typeof appleAuth.verifyAppleIdentityToken>;
    mockVerify.mockResolvedValueOnce({
      sub: 'apple-sub-123',
      email: 'user@example.com',
      email_verified: true,
      iss: 'https://appleid.apple.com',
      aud: 'com.example.app',
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000),
    });
    const res = await request(app)
      .post('/api/v2/auth/apple')
      .send({ identityToken: 'valid.jwt.here' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.verified).toBe(true);
    expect(res.body.sub).toBe('apple-sub-123');
    expect(res.body.email).toBe('user@example.com');
  });
});
