import { Router } from 'express';
import { z } from 'zod';
import { supabase } from '../../config/database';
import { VERSION } from '@fanclubz/shared';
import { logAdminAction } from './audit';

export const moderationRouter = Router();

async function logModerationAction(args: {
  actorId: string;
  actionType: string;
  targetType: string;
  targetId: string;
  notes?: string | null;
}) {
  try {
    await supabase.from('moderation_actions').insert({
      actor_user_id: args.actorId,
      action_type: args.actionType,
      target_type: args.targetType,
      target_id: args.targetId,
      notes: args.notes || null,
    });
  } catch (e) {
    // best-effort; table may not exist
  }
}

/**
 * GET /api/v2/admin/moderation/creators
 * List creators with stats (predictions created, total stake, etc.)
 */
moderationRouter.get('/creators', async (req, res) => {
  try {
    const limit = Math.min(100, Number(req.query.limit) || 50);
    const offset = Number(req.query.offset) || 0;

    // Get users who have created predictions
    const { data: creators, error, count } = await supabase
      .from('users')
      .select(`
        id, username, full_name, email, avatar_url, created_at,
        is_banned, ban_reason, is_verified
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('[Admin/Moderation] Creators query error:', error);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to fetch creators',
        version: VERSION,
      });
    }

    // Get prediction counts for each creator
    const creatorIds = (creators || []).map(c => c.id);
    const { data: predCounts } = await supabase
      .from('predictions')
      .select('creator_id')
      .in('creator_id', creatorIds);

    const countMap: Record<string, number> = {};
    for (const p of predCounts || []) {
      countMap[p.creator_id] = (countMap[p.creator_id] || 0) + 1;
    }

    return res.json({
      items: (creators || []).map(c => ({
        id: c.id,
        username: c.username,
        fullName: c.full_name,
        email: c.email,
        avatarUrl: c.avatar_url,
        createdAt: c.created_at,
        isBanned: c.is_banned || false,
        banReason: c.ban_reason || null,
        isVerified: c.is_verified || false,
        predictionCount: countMap[c.id] || 0,
      })),
      total: count || 0,
      limit,
      offset,
      version: VERSION,
    });
  } catch (error) {
    console.error('[Admin/Moderation] Error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch creators',
      version: VERSION,
    });
  }
});

const BanSchema = z.object({
  reason: z.string().min(5, 'Reason must be at least 5 characters'),
  actorId: z.string().uuid(),
});

/**
 * POST /api/v2/admin/moderation/users/:userId/ban
 * Ban a user
 */
moderationRouter.post('/users/:userId/ban', async (req, res) => {
  try {
    const { userId } = req.params;
    const parsed = BanSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid payload',
        details: parsed.error.issues,
        version: VERSION,
      });
    }

    const { reason, actorId } = parsed.data;

    // Get user info
    const { data: user } = await supabase
      .from('users')
      .select('id, username, email, is_banned')
      .eq('id', userId)
      .maybeSingle();

    if (!user) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'User not found',
        version: VERSION,
      });
    }

    if (user.is_banned) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'User is already banned',
        version: VERSION,
      });
    }

    // Ban the user
    const { error: updateError } = await supabase
      .from('users')
      .update({
        is_banned: true,
        ban_reason: reason,
        banned_at: new Date().toISOString(),
        banned_by: actorId,
      })
      .eq('id', userId);

    if (updateError) {
      console.error('[Admin/Moderation] Ban update error:', updateError);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to ban user',
        version: VERSION,
      });
    }

    // Log admin action
    await logAdminAction({
      actorId,
      action: 'user_ban',
      targetType: 'user',
      targetId: userId,
      reason,
      meta: { username: user.username, email: user.email },
    });

    return res.json({
      success: true,
      message: 'User banned successfully',
      version: VERSION,
    });
  } catch (error) {
    console.error('[Admin/Moderation] Ban error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to ban user',
      version: VERSION,
    });
  }
});

const UnbanSchema = z.object({
  actorId: z.string().uuid(),
});

/**
 * POST /api/v2/admin/moderation/users/:userId/unban
 * Unban a user
 */
moderationRouter.post('/users/:userId/unban', async (req, res) => {
  try {
    const { userId } = req.params;
    const parsed = UnbanSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid payload',
        details: parsed.error.issues,
        version: VERSION,
      });
    }

    const { actorId } = parsed.data;

    // Get user info
    const { data: user } = await supabase
      .from('users')
      .select('id, username, email, is_banned')
      .eq('id', userId)
      .maybeSingle();

    if (!user) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'User not found',
        version: VERSION,
      });
    }

    if (!user.is_banned) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'User is not banned',
        version: VERSION,
      });
    }

    // Unban the user
    const { error: updateError } = await supabase
      .from('users')
      .update({
        is_banned: false,
        ban_reason: null,
        banned_at: null,
        banned_by: null,
      })
      .eq('id', userId);

    if (updateError) {
      console.error('[Admin/Moderation] Unban update error:', updateError);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to unban user',
        version: VERSION,
      });
    }

    // Log admin action
    await logAdminAction({
      actorId,
      action: 'user_unban',
      targetType: 'user',
      targetId: userId,
      meta: { username: user.username, email: user.email },
    });

    return res.json({
      success: true,
      message: 'User unbanned successfully',
      version: VERSION,
    });
  } catch (error) {
    console.error('[Admin/Moderation] Unban error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to unban user',
      version: VERSION,
    });
  }
});

const VerifySchema = z.object({
  actorId: z.string().uuid(),
});

/**
 * POST /api/v2/admin/moderation/users/:userId/verify
 * Verify a creator account
 */
moderationRouter.post('/users/:userId/verify', async (req, res) => {
  try {
    const { userId } = req.params;
    const parsed = VerifySchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid payload',
        details: parsed.error.issues,
        version: VERSION,
      });
    }

    const { actorId } = parsed.data;

    // Update verification status
    const { error: updateError } = await supabase
      .from('users')
      .update({
        is_verified: true,
        verified_at: new Date().toISOString(),
        verified_by: actorId,
      })
      .eq('id', userId);

    if (updateError) {
      console.error('[Admin/Moderation] Verify update error:', updateError);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to verify user',
        version: VERSION,
      });
    }

    // Log admin action
    await logAdminAction({
      actorId,
      action: 'user_verify',
      targetType: 'user',
      targetId: userId,
    });

    return res.json({
      success: true,
      message: 'User verified successfully',
      version: VERSION,
    });
  } catch (error) {
    console.error('[Admin/Moderation] Verify error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to verify user',
      version: VERSION,
    });
  }
});

/**
 * POST /api/v2/admin/moderation/users/:userId/unverify
 * Remove verification from a creator account
 */
moderationRouter.post('/users/:userId/unverify', async (req, res) => {
  try {
    const { userId } = req.params;
    const parsed = VerifySchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid payload',
        details: parsed.error.issues,
        version: VERSION,
      });
    }

    const { actorId } = parsed.data;

    // Update verification status
    const { error: updateError } = await supabase
      .from('users')
      .update({
        is_verified: false,
        verified_at: null,
        verified_by: null,
      })
      .eq('id', userId);

    if (updateError) {
      console.error('[Admin/Moderation] Unverify update error:', updateError);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to unverify user',
        version: VERSION,
      });
    }

    // Log admin action
    await logAdminAction({
      actorId,
      action: 'user_unverify',
      targetType: 'user',
      targetId: userId,
    });

    return res.json({
      success: true,
      message: 'User verification removed',
      version: VERSION,
    });
  } catch (error) {
    console.error('[Admin/Moderation] Unverify error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to unverify user',
      version: VERSION,
    });
  }
});

/**
 * GET /api/v2/admin/moderation/reports
 * List reported content (predictions, comments, users)
 */
moderationRouter.get('/reports', async (req, res) => {
  try {
    const status = String(req.query.status || 'open');
    const limit = Math.min(100, Number(req.query.limit) || 50);
    const offset = Number(req.query.offset) || 0;

    const statusFilter = status === 'open'
      ? ['open']
      : status === 'resolved'
        ? ['resolved']
        : status === 'dismissed'
          ? ['dismissed']
          : ['open'];

    const { data: reports, error, count } = await supabase
      .from('content_reports')
      .select(`
        id, reporter_id, target_type, target_id, reason_category, reason, status, created_at, resolved_at, resolved_by,
        users!content_reports_reporter_id_fkey(username)
      `, { count: 'exact' })
      .in('status', statusFilter)
      .order('created_at', { ascending: statusFilter[0] === 'open' })
      .range(offset, offset + limit - 1);

    if (error) {
      // Table might not exist yet
      console.warn('[Admin/Moderation] Reports query error:', error);
      return res.json({
        items: [],
        total: 0,
        limit,
        offset,
        version: VERSION,
      });
    }

    return res.json({
      items: (reports || []).map((r: any) => ({
        id: r.id,
        reporterId: r.reporter_id,
        reporterUsername: r.users?.username ?? null,
        targetType: r.target_type,
        targetId: r.target_id,
        reasonCategory: r.reason_category ?? null,
        reason: r.reason,
        status: r.status,
        createdAt: r.created_at,
        ageHours: r.created_at ? Math.floor((Date.now() - new Date(r.created_at).getTime()) / 3600000) : 0,
        resolvedAt: r.resolved_at,
        resolvedBy: r.resolved_by,
      })),
      total: count || 0,
      limit,
      offset,
      version: VERSION,
    });
  } catch (error) {
    console.error('[Admin/Moderation] Reports error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch reports',
      version: VERSION,
    });
  }
});

/**
 * GET /api/v2/admin/moderation/reports/comments
 * Comments-only moderation queue alias (oldest first by default).
 */
moderationRouter.get('/reports/comments', async (req, res) => {
  try {
    const status = String(req.query.status || 'open');
    const limit = Math.min(100, Number(req.query.limit) || 50);
    const offset = Number(req.query.offset) || 0;

    const statusFilter = status === 'open'
      ? ['open']
      : status === 'resolved'
        ? ['resolved']
        : status === 'dismissed'
          ? ['dismissed']
          : ['open'];

    const { data: reports, error, count } = await supabase
      .from('content_reports')
      .select(`
        id, reporter_id, target_type, target_id, reason_category, reason, status, created_at, resolved_at, resolved_by,
        users!content_reports_reporter_id_fkey(username)
      `, { count: 'exact' })
      .eq('target_type', 'comment')
      .in('status', statusFilter)
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) {
      console.warn('[Admin/Moderation] Comment reports query error:', error);
      return res.json({ items: [], total: 0, limit, offset, version: VERSION });
    }

    return res.json({
      items: (reports || []).map((r: any) => ({
        id: r.id,
        reporterId: r.reporter_id,
        reporterUsername: r.users?.username ?? null,
        targetType: r.target_type,
        targetId: r.target_id,
        reasonCategory: r.reason_category ?? null,
        reason: r.reason,
        status: r.status,
        createdAt: r.created_at,
        ageHours: r.created_at ? Math.floor((Date.now() - new Date(r.created_at).getTime()) / 3600000) : 0,
        resolvedAt: r.resolved_at,
        resolvedBy: r.resolved_by,
      })),
      total: count || 0,
      limit,
      offset,
      version: VERSION,
    });
  } catch (error) {
    console.error('[Admin/Moderation] Comment reports error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch comment reports',
      version: VERSION,
    });
  }
});

const ResolveReportSchema = z.object({
  action: z.enum(['dismiss', 'warn', 'remove', 'ban']),
  actorId: z.string().uuid(),
  notes: z.string().optional(),
});

const RemoveContentSchema = z.object({
  targetType: z.enum(['prediction', 'comment', 'user']),
  targetId: z.string().uuid(),
  reason: z.string().min(3).max(500),
  actorId: z.string().uuid(),
});

const SuspendUserSchema = z.object({
  userId: z.string().uuid(),
  reason: z.string().min(3).max(500),
  actorId: z.string().uuid(),
});

async function applyModerationRemove(args: {
  actorId: string;
  targetType: 'prediction' | 'comment' | 'user';
  targetId: string;
  reason: string;
}) {
  if (args.targetType === 'prediction') {
    await supabase
      .from('predictions')
      .update({
        removed_at: new Date().toISOString(),
        removed_by: args.actorId,
        remove_reason: args.reason,
        hidden_at: new Date().toISOString(),
        hidden_by: args.actorId,
        hidden_reason: args.reason,
      })
      .eq('id', args.targetId);
  }
  if (args.targetType === 'comment') {
    await supabase
      .from('comments')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: args.actorId,
        deleted_reason: args.reason,
        content: null,
      })
      .eq('id', args.targetId);
  }
  if (args.targetType === 'user') {
    await supabase
      .from('users')
      .update({
        is_banned: true,
        ban_reason: args.reason,
        banned_at: new Date().toISOString(),
        banned_by: args.actorId,
      })
      .eq('id', args.targetId);
  }

  await logModerationAction({
    actorId: args.actorId,
    actionType: 'remove_content',
    targetType: args.targetType,
    targetId: args.targetId,
    notes: args.reason,
  });
}

async function applyModerationSuspend(args: {
  actorId: string;
  userId: string;
  reason: string;
}) {
  await supabase
    .from('users')
    .update({
      is_banned: true,
      ban_reason: args.reason,
      banned_at: new Date().toISOString(),
      banned_by: args.actorId,
    })
    .eq('id', args.userId);

  await logModerationAction({
    actorId: args.actorId,
    actionType: 'suspend_user',
    targetType: 'user',
    targetId: args.userId,
    notes: args.reason,
  });
}

/**
 * POST /api/v2/admin/moderation/remove
 * Remove content (soft delete or hide) by admin action
 */
moderationRouter.post('/remove', async (req, res) => {
  try {
    const parsed = RemoveContentSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid payload',
        details: parsed.error.issues,
        version: VERSION,
      });
    }
    const { targetType, targetId, reason, actorId } = parsed.data;

    await applyModerationRemove({ actorId, targetType, targetId, reason });

    await logAdminAction({
      actorId,
      action: 'moderation_remove',
      targetType,
      targetId,
      reason,
    });

    return res.json({
      success: true,
      message: 'Content removed',
      version: VERSION,
    });
  } catch (error) {
    console.error('[Admin/Moderation] Remove error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to remove content',
      version: VERSION,
    });
  }
});

/**
 * POST /api/v2/admin/moderation/suspend-user
 * Suspend a user (admin action)
 */
moderationRouter.post('/suspend-user', async (req, res) => {
  try {
    const parsed = SuspendUserSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid payload',
        details: parsed.error.issues,
        version: VERSION,
      });
    }
    const { userId, reason, actorId } = parsed.data;

    await applyModerationSuspend({ actorId, userId, reason });

    await logAdminAction({
      actorId,
      action: 'user_suspend',
      targetType: 'user',
      targetId: userId,
      reason,
    });

    return res.json({
      success: true,
      message: 'User suspended',
      version: VERSION,
    });
  } catch (error) {
    console.error('[Admin/Moderation] Suspend error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to suspend user',
      version: VERSION,
    });
  }
});

/**
 * POST /api/v2/admin/moderation/reports/:reportId/resolve
 * Resolve a content report
 */
moderationRouter.post('/reports/:reportId/resolve', async (req, res) => {
  try {
    const { reportId } = req.params;
    const parsed = ResolveReportSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid payload',
        details: parsed.error.issues,
        version: VERSION,
      });
    }

    const { action, actorId, notes } = parsed.data;

    const { data: report, error: reportError } = await supabase
      .from('content_reports')
      .select('id, target_type, target_id')
      .eq('id', reportId)
      .maybeSingle();
    if (reportError || !report) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Report not found',
        version: VERSION,
      });
    }

    const nextStatus = action === 'dismiss' ? 'dismissed' : 'resolved';
    const { error: updateError } = await supabase
      .from('content_reports')
      .update({
        status: nextStatus,
        resolution_action: action,
        resolution_notes: notes || null,
        resolved_at: new Date().toISOString(),
        resolved_by: actorId,
      })
      .eq('id', reportId);

    if (updateError) {
      console.error('[Admin/Moderation] Resolve report error:', updateError);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to resolve report',
        version: VERSION,
      });
    }

    // Apply moderation action to target (remove/suspend)
    if (action === 'remove') {
      await applyModerationRemove({
        actorId,
        targetType: report.target_type,
        targetId: report.target_id,
        reason: notes || 'Removed via moderation report',
      });
    }
    if (action === 'ban' && report.target_type === 'user') {
      await applyModerationSuspend({
        actorId,
        userId: report.target_id,
        reason: notes || 'Suspended via moderation report',
      });
    }

    // Log admin action
    await logAdminAction({
      actorId,
      action: 'report_resolve',
      targetType: 'report',
      targetId: reportId,
      reason: notes || undefined,
      meta: { resolution_action: action },
    });
    await logModerationAction({
      actorId,
      actionType: `report_${action}`,
      targetType: report.target_type,
      targetId: report.target_id,
      notes: notes || null,
    });

    return res.json({
      success: true,
      message: 'Report resolved',
      version: VERSION,
    });
  } catch (error) {
    console.error('[Admin/Moderation] Resolve error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to resolve report',
      version: VERSION,
    });
  }
});
