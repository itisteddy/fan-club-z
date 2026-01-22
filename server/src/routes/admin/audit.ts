import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { supabase } from '../../config/database';
import { VERSION } from '@fanclubz/shared';

export const auditRouter = Router();

// Admin user IDs from env (comma-separated) OR check users.is_admin
const ADMIN_USER_IDS = (process.env.ADMIN_USER_IDS || '').split(',').filter(Boolean);
const ADMIN_API_KEY = process.env.ADMIN_API_KEY;

/**
 * Middleware to require admin access
 */
export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  // Check for admin API key in header
  const apiKey = req.headers['x-admin-key'] as string | undefined;
  if (ADMIN_API_KEY && apiKey === ADMIN_API_KEY) {
    return next();
  }

  // Check for userId in query or body
  const userId = (req.query.userId || req.query.actorId || (req.body as any)?.userId || (req.body as any)?.actorId) as string | undefined;
  
  if (!userId) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Admin access required',
      version: VERSION,
    });
  }

  // Check if user is in admin list
  if (ADMIN_USER_IDS.includes(userId)) {
    return next();
  }

  // Check users.is_admin flag (this codebase uses public.users)
  const { data: userRow } = await supabase
    .from('users')
    .select('is_admin')
    .eq('id', userId)
    .maybeSingle();

  if ((userRow as any)?.is_admin) {
    return next();
  }

  return res.status(403).json({
    error: 'Forbidden',
    message: 'Admin privileges required',
    version: VERSION,
  });
}

/**
 * Helper to log admin actions - exported for use in other admin routes
 */
export async function logAdminAction(args: {
  actorId: string;
  action: string;
  targetType?: string;
  targetId?: string;
  reason?: string;
  meta?: Record<string, unknown>;
}) {
  try {
    const { error } = await supabase.from('admin_audit_log').insert({
      actor_id: args.actorId,
      action: args.action,
      target_type: args.targetType || null,
      target_id: args.targetId || null,
      reason: args.reason || null,
      meta: args.meta || null,
    } as any);

    if (error) {
      // Some environments may not have admin_audit_log (legacy schema). Best-effort logging only.
      const code = String((error as any)?.code || '');
      const msg = String((error as any)?.message || '');
      if (code === '42P01' || msg.includes('does not exist')) {
        console.warn('[Admin] admin_audit_log missing; skipping audit log insert');
      } else {
        console.error('[Admin] Failed to log audit action:', error);
      }
    }
  } catch (e) {
    console.error('[Admin] Audit log error:', e);
  }
}

const AuditQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(200).default(50),
  offset: z.coerce.number().min(0).default(0),
  action: z.string().optional(),
  actorId: z.string().uuid().optional(),
  targetType: z.string().optional(),
});

/**
 * GET /api/v2/admin/audit
 * List audit log entries with filtering
 */
auditRouter.get('/', async (req, res) => {
  try {
    const parsed = AuditQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid query parameters',
        details: parsed.error.issues,
        version: VERSION,
      });
    }

    const { limit, offset, action, actorId, targetType } = parsed.data;

    let query = supabase
      .from('admin_audit_log')
      .select('id, actor_id, action, target_type, target_id, reason, meta, created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (action) {
      query = query.eq('action', action);
    }
    if (actorId) {
      query = query.eq('actor_id', actorId);
    }
    if (targetType) {
      query = query.eq('target_type', targetType);
    }

    const { data, error, count } = await query;

    if (error) {
      // Legacy envs may not have admin_audit_log; return empty list instead of breaking admin.
      const code = String((error as any)?.code || '');
      const msg = String((error as any)?.message || '');
      if (code === '42P01' || msg.includes('does not exist')) {
        console.warn('[Admin] admin_audit_log missing; returning empty audit list');
        return res.json({ items: [], total: 0, limit, offset, version: VERSION });
      }
      console.error('[Admin] Failed to fetch audit log:', error);
      return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to fetch audit log', version: VERSION });
    }

    // Fetch actor usernames for display
    const actorIds = [...new Set((data || []).map(d => d.actor_id))];
    const { data: users } = await supabase
      .from('users')
      .select('id, username, full_name')
      .in('id', actorIds);

    const actorMap = new Map((users || []).map(p => [p.id, p]));

    const items = (data || []).map(row => ({
      id: row.id,
      actorId: row.actor_id,
      actorName: actorMap.get(row.actor_id)?.username || actorMap.get(row.actor_id)?.full_name || 'Unknown',
      action: row.action,
      targetType: row.target_type,
      targetId: row.target_id,
      reason: row.reason,
      meta: row.meta,
      createdAt: row.created_at,
    }));

    return res.json({
      items,
      total: count || 0,
      limit,
      offset,
      version: VERSION,
    });
  } catch (error) {
    console.error('[Admin] Audit log error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch audit log',
      version: VERSION,
    });
  }
});

/**
 * GET /api/v2/admin/audit/actions
 * Get distinct action types for filtering
 */
auditRouter.get('/actions', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('admin_audit_log')
      .select('action')
      .limit(1000);

    if (error) {
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to fetch actions',
        version: VERSION,
      });
    }

    const actions = [...new Set((data || []).map(d => d.action))].sort();

    return res.json({
      actions,
      version: VERSION,
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch actions',
      version: VERSION,
    });
  }
});

