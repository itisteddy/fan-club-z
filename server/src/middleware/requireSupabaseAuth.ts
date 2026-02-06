import type { Response, NextFunction } from 'express';
import { supabase, supabaseAnon } from '../config/database';
import type { AuthenticatedRequest } from './auth';

/**
 * Account status type — matches DB CHECK constraint.
 */
export type AccountStatus = 'active' | 'deleted' | 'suspended';

/**
 * Reads account_status from users table.  Falls back to is_banned/ban_reason
 * when account_status column doesn't exist yet (pre-migration 329).
 */
async function resolveAccountStatus(userId: string): Promise<AccountStatus | null> {
  // Try new column first
  try {
    const { data, error } = await supabase
      .from('users')
      .select('account_status')
      .eq('id', userId)
      .maybeSingle();
    if (!error && data && (data as any).account_status) {
      return (data as any).account_status as AccountStatus;
    }
    // If error is about missing column, fall through to legacy
    if (error) {
      const msg = String(error.message || '').toLowerCase();
      if (!msg.includes('does not exist')) {
        // Some other error — treat as unknown, don't block
        return null;
      }
    } else if (data && !(data as any).account_status) {
      // Column exists but user not found or status null – treat as active
      return data ? 'active' : null;
    }
  } catch {
    // ignore
  }

  // Legacy fallback: is_banned + ban_reason
  try {
    const { data: legacy, error: legacyErr } = await supabase
      .from('users')
      .select('username, is_banned, ban_reason')
      .eq('id', userId)
      .maybeSingle();
    if (legacyErr || !legacy) return null;
    if ((legacy as any).is_banned) {
      const reason = String((legacy as any).ban_reason || '').toLowerCase();
      if (reason === 'self_deleted') return 'deleted';
      return 'suspended';
    }
    // Check username prefix as last resort
    const uname = String((legacy as any).username || '');
    if (uname.startsWith('deleted_')) return 'deleted';
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
