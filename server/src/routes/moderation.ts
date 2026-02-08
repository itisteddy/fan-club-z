import { Router } from 'express';
import { z } from 'zod';
import { supabase } from '../config/database';
import { requireSupabaseAuth } from '../middleware/requireSupabaseAuth';
import { requireTermsAccepted } from '../middleware/requireTermsAccepted';
import type { AuthenticatedRequest } from '../middleware/auth';
import { VERSION } from '@fanclubz/shared';
import { logAdminAction } from './admin/audit';

export const moderationRouter = Router();

const ReportSchema = z.object({
  targetType: z.enum(['prediction', 'comment', 'user']),
  targetId: z.string().uuid(),
  reasonCategory: z.string().min(3).max(64).optional(),
  reason: z.string().min(3).max(500),
  details: z.string().max(500).optional().nullable(),
});

const BlockSchema = z.object({
  blockedUserId: z.string().uuid(),
});

// GET /api/v2/moderation/blocks - list blocked user ids
moderationRouter.get('/blocks', requireSupabaseAuth, async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  const userId = authReq.user?.id;
  if (!userId) {
    return res.status(401).json({ error: 'unauthorized', message: 'Authorization required', version: VERSION });
  }
  const { data, error } = await supabase
    .from('user_blocks')
    .select('blocked_user_id')
    .eq('blocker_id', userId);
  if (error) {
    return res.json({ data: { blockedUserIds: [] }, version: VERSION });
  }
  const blockedUserIds = (data || []).map((r: any) => r.blocked_user_id).filter(Boolean);
  return res.json({ data: { blockedUserIds }, version: VERSION });
});

// POST /api/v2/moderation/blocks - block user
moderationRouter.post('/blocks', requireSupabaseAuth, requireTermsAccepted, async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  const userId = authReq.user?.id;
  if (!userId) {
    return res.status(401).json({ error: 'unauthorized', message: 'Authorization required', version: VERSION });
  }
  const parsed = BlockSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Bad Request', message: 'Invalid payload', details: parsed.error.issues, version: VERSION });
  }
  const { blockedUserId } = parsed.data;
  if (blockedUserId === userId) {
    return res.status(400).json({ error: 'Bad Request', message: 'You cannot block yourself.', version: VERSION });
  }

  const { error } = await supabase
    .from('user_blocks')
    .upsert({ blocker_id: userId, blocked_user_id: blockedUserId }, { onConflict: 'blocker_id,blocked_user_id' });
  if (error && String((error as any).code || '') !== '23505') {
    return res.status(503).json({ error: 'Service Unavailable', message: 'Failed to block user', version: VERSION });
  }

  // Hide blocked user content for blocker (instant UX)
  await supabase
    .from('content_hides')
    .upsert({ user_id: userId, target_type: 'user', target_id: blockedUserId }, { onConflict: 'user_id,target_type,target_id' });

  await logAdminAction({
    actorId: userId,
    action: 'block_user',
    targetType: 'user',
    targetId: blockedUserId,
    reason: 'user_block',
  });

  return res.status(201).json({ data: { blockedUserId }, message: 'User blocked', version: VERSION });
});

// DELETE /api/v2/moderation/blocks/:blockedUserId - unblock
moderationRouter.delete('/blocks/:blockedUserId', requireSupabaseAuth, requireTermsAccepted, async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  const userId = authReq.user?.id;
  if (!userId) {
    return res.status(401).json({ error: 'unauthorized', message: 'Authorization required', version: VERSION });
  }
  const { blockedUserId } = req.params;
  if (!blockedUserId) {
    return res.status(400).json({ error: 'Bad Request', message: 'blockedUserId is required', version: VERSION });
  }

  await supabase
    .from('user_blocks')
    .delete()
    .eq('blocker_id', userId)
    .eq('blocked_user_id', blockedUserId);

  await supabase
    .from('content_hides')
    .delete()
    .eq('user_id', userId)
    .eq('target_type', 'user')
    .eq('target_id', blockedUserId);

  return res.status(200).json({ data: { unblockedUserId: blockedUserId }, message: 'User unblocked', version: VERSION });
});

// POST /api/v2/moderation/reports - report content
moderationRouter.post('/reports', requireSupabaseAuth, requireTermsAccepted, async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  const userId = authReq.user?.id;
  if (!userId) {
    return res.status(401).json({ error: 'unauthorized', message: 'Authorization required', version: VERSION });
  }
  const parsed = ReportSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Bad Request', message: 'Invalid payload', details: parsed.error.issues, version: VERSION });
  }
  const { targetType, targetId, reason, reasonCategory, details } = parsed.data;

  // Validate target exists
  if (targetType === 'comment') {
    const { data } = await supabase.from('comments').select('id').eq('id', targetId).maybeSingle();
    if (!data) return res.status(404).json({ error: 'Not Found', message: 'Comment not found', version: VERSION });
  }
  if (targetType === 'prediction') {
    const { data } = await supabase.from('predictions').select('id').eq('id', targetId).maybeSingle();
    if (!data) return res.status(404).json({ error: 'Not Found', message: 'Prediction not found', version: VERSION });
  }
  if (targetType === 'user') {
    const { data } = await supabase.from('users').select('id').eq('id', targetId).maybeSingle();
    if (!data) return res.status(404).json({ error: 'Not Found', message: 'User not found', version: VERSION });
  }

  const { data: report, error } = await supabase
    .from('content_reports')
    .insert({
      reporter_id: userId,
      target_type: targetType,
      target_id: targetId,
      reason_category: reasonCategory || null,
      reason: reason.trim(),
      details: details || null,
      status: 'open',
    })
    .select('id')
    .single();
  const reportId = (report as { id?: string } | null)?.id;

  if (error) {
    if (String((error as any).code || '') === '23505') {
      return res.status(200).json({ data: { id: reportId }, message: 'Report already submitted.', version: VERSION });
    }
    return res.status(503).json({ error: 'Service Unavailable', message: 'Failed to submit report', version: VERSION });
  }

  await supabase
    .from('content_hides')
    .upsert({ user_id: userId, target_type: targetType, target_id: targetId }, { onConflict: 'user_id,target_type,target_id' });

  return res.status(201).json({ data: { id: reportId }, message: 'Report submitted. Our team will review it.', version: VERSION });
});
