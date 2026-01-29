/**
 * Auth routes — Sign in with Apple (Phase 2).
 * POST /auth/apple verifies Apple identity token and returns claims.
 * Client obtains Supabase session via signInWithIdToken(provider: 'apple', token).
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { VERSION } from '@fanclubz/shared';
import { verifyAppleIdentityToken } from '../services/appleAuth';

const AppleAuthSchema = z.object({
  identityToken: z.string().min(1, 'identityToken is required'),
  authorizationCode: z.string().optional(),
  nonce: z.string().optional(),
});

export const authRouter = Router();

/**
 * POST /api/v2/auth/apple
 * Verify Apple identity token and return claims.
 * Client must then call Supabase signInWithIdToken({ provider: 'apple', token }) to get session.
 */
authRouter.post('/apple', async (req: Request, res: Response) => {
  try {
    const parsed = AppleAuthSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid payload',
        details: parsed.error.issues,
        version: VERSION,
      });
    }

    const { identityToken } = parsed.data;

    const payload = await verifyAppleIdentityToken(identityToken);

    // Return only what client needs; no extra data per Apple 4.8
    return res.status(200).json({
      success: true,
      verified: true,
      sub: payload.sub,
      email: payload.email ?? null,
      name: payload.name ?? null,
      isPrivateEmail: payload.is_private_email ?? false,
      version: VERSION,
    });
  } catch (err: any) {
    const message = err?.message ?? 'Apple token verification failed';
    console.warn('[Auth/Apple] Verification failed:', message);
    return res.status(401).json({
      error: 'Unauthorized',
      message,
      version: VERSION,
    });
  }
});
