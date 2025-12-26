import { Router } from 'express';
import { z } from 'zod';
import { supabase } from '../../config/database';
import { VERSION } from '@fanclubz/shared';
import { logAdminAction } from './audit';

export const moderationRouter = Router();

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
    const status = req.query.status || 'pending';
    const limit = Math.min(100, Number(req.query.limit) || 50);
    const offset = Number(req.query.offset) || 0;

    const { data: reports, error, count } = await supabase
      .from('content_reports')
      .select(`
        id, reporter_id, target_type, target_id, reason, status, created_at, resolved_at, resolved_by,
        users!content_reports_reporter_id_fkey(username)
      `, { count: 'exact' })
      .eq('status', status)
      .order('created_at', { ascending: false })
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
        reporterUsername: r.profiles?.username || null,
        targetType: r.target_type,
        targetId: r.target_id,
        reason: r.reason,
        status: r.status,
        createdAt: r.created_at,
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

const ResolveReportSchema = z.object({
  action: z.enum(['dismiss', 'warn', 'remove', 'ban']),
  actorId: z.string().uuid(),
  notes: z.string().optional(),
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

    // Update report status
    const { error: updateError } = await supabase
      .from('content_reports')
      .update({
        status: 'resolved',
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

    // Log admin action
    await logAdminAction({
      actorId,
      action: 'report_resolve',
      targetType: 'report',
      targetId: reportId,
      reason: notes || undefined,
      meta: { resolution_action: action },
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

