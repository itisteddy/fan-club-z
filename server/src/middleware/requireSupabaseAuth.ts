import type { Response, NextFunction } from 'express';
import { supabaseAnon } from '../config/database';
import type { AuthenticatedRequest } from './auth';

/**
 * Minimal Supabase auth enforcement for Phase 7 money routes.
 * Validates the Bearer token via Supabase and sets req.user.
 *
 * NOTE: This avoids guessing JWT secrets and matches the client behavior
 * (client sends Supabase access_token as Authorization Bearer).
 */
export async function requireSupabaseAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = String(req.headers.authorization || '');
  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'unauthorized', message: 'Authorization required' });
  }

  const token = authHeader.slice('Bearer '.length).trim();
  if (!token) {
    return res.status(401).json({ error: 'unauthorized', message: 'Authorization required' });
  }

  try {
    const { data, error } = await supabaseAnon.auth.getUser(token);
    if (error || !data?.user) {
      return res.status(401).json({ error: 'unauthorized', message: 'Invalid session' });
    }

    req.user = {
      id: data.user.id,
      email: data.user.email || '',
      username: (data.user.user_metadata as any)?.username,
    };

    return next();
  } catch (e) {
    return res.status(401).json({ error: 'unauthorized', message: 'Invalid session' });
  }
}

