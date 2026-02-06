import type { Response, NextFunction } from 'express';
import { supabase, supabaseAnon } from '../config/database';
import type { AuthenticatedRequest } from './auth';

/**
 * Account status type — matches DB CHECK constraint.
 */
export type AccountStatus = 'active' | 'deleted' | 'suspended';

/**
 * Reads account status from users table.
 * Uses only columns that are guaranteed to exist (username from base schema).
 * Checks is_banned/ban_reason if available, falls back to username prefix.
 * Never throws — returns null on any failure.
 */
async function resolveAccountStatus(userId: string): Promise<AccountStatus | null> {
  try {
    // Query only columns we KNOW exist in the base schema
    const { data, error } = await supabase
      .from('users')
      .select('username')
      .eq('id', userId)
      .maybeSingle();

    if (error || !data) return null;

    const username = String((data as any).username || '');

    // Check username prefix (always works, no extra columns needed)
    if (username.startsWith('deleted_')) return 'deleted';

    // Best-effort: try to read is_banned for admin suspensions
    try {
      const { data: modData, error: modErr } = await supabase
        .from('users')
        .select('is_banned, ban_reason')
        .eq('id', userId)
        .maybeSingle();
      if (!modErr && modData && (modData as any).is_banned) {
        const reason = String((modData as any).ban_reason || '').toLowerCase();
        if (reason === 'self_deleted') return 'deleted';
        return 'suspended';
      }
    } catch {
      // is_banned column may not exist — that's fine
    }

    return 'active';
  } catch {
    return null;
  }
}

/**
 * Minimal Supabase auth enforcement.
 * Validates the Bearer token via Supabase and sets req.user.
 * Returns status-aware error codes:
 *  - 409 ACCOUNT_DELETED for self-deleted accounts
 *  - 403 ACCOUNT_SUSPENDED for admin-suspended accounts
 *
 * IMPORTANT: Auth sessions are allowed to be established (login succeeds),
 * but individual endpoints enforce status. This middleware attaches status
 * so downstream handlers can decide.
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

    // Resolve account status — defensive: if lookup fails, allow through
    try {
      const status = await resolveAccountStatus(req.user.id);
      // Attach status for downstream handlers
      (req as any).accountStatus = status || 'active';

      if (status === 'deleted') {
        return res.status(409).json({
          error: 'account_deleted',
          code: 'ACCOUNT_DELETED',
          message: 'This account was previously deleted. You can restore it to continue using the app.',
        });
      }
      if (status === 'suspended') {
        return res.status(403).json({
          error: 'account_suspended',
          code: 'ACCOUNT_SUSPENDED',
          message: 'This account has been suspended. Contact support for assistance.',
        });
      }
    } catch {
      // Defensive: never block auth for everyone if status lookup fails
    }

    return next();
  } catch (e) {
    return res.status(401).json({ error: 'unauthorized', message: 'Invalid session' });
  }
}

/**
 * Variant that allows deleted accounts through (for restore + status endpoints).
 * Attaches req.user and (req as any).accountStatus but does NOT block deleted users.
 */
export async function requireSupabaseAuthAllowDeleted(req: AuthenticatedRequest, res: Response, next: NextFunction) {
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

    try {
      const status = await resolveAccountStatus(req.user.id);
      (req as any).accountStatus = status || 'active';

      // Block suspended accounts even on status endpoints
      if (status === 'suspended') {
        return res.status(403).json({
          error: 'account_suspended',
          code: 'ACCOUNT_SUSPENDED',
          message: 'This account has been suspended. Contact support for assistance.',
        });
      }
    } catch {
      (req as any).accountStatus = 'active';
    }

    return next();
  } catch (e) {
    return res.status(401).json({ error: 'unauthorized', message: 'Invalid session' });
  }
}
