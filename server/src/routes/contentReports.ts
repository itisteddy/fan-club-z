/**
 * User-facing content reporting (UGC moderation)
 * POST /api/v2/content/report - Submit a report (predictions, comments, users)
 * Admin list/resolve: GET/POST under /api/v2/admin/moderation/reports
 */

import { Router } from 'express';
import { z } from 'zod';
import { supabase } from '../config/database';
import { VERSION } from '@fanclubz/shared';
import { requireSupabaseAuth } from '../middleware/requireSupabaseAuth';
import type { AuthenticatedRequest } from '../middleware/auth';

export const contentReportsRouter = Router();

const ReportBodySchema = z.object({
  targetType: z.enum(['prediction', 'comment', 'user']),
  targetId: z.string().uuid(),
  reasonCategory: z.string().min(3).max(64).optional(),
  reason: z.string().min(3, 'Reason must be at least 3 characters').max(500),
});

/**
 * POST /api/v2/content/report
 * Submit a content report (requires auth)
 */
contentReportsRouter.post('/report', requireSupabaseAuth, async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user?.id;
    if (!userId) {
      return res.status(401).json({
        error: 'unauthorized',
        message: 'Authorization required',
        version: VERSION,
      });
    }

    const parsed = ReportBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid payload',
        details: parsed.error.issues,
        version: VERSION,
      });
    }

    const { targetType, targetId, reason, reasonCategory } = parsed.data;

    // Basic rate limit: max 5 reports per 10 minutes (per user)
    const windowStart = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { count: recentCount } = await supabase
      .from('content_reports')
      .select('id', { count: 'exact', head: true })
      .eq('reporter_id', userId)
      .gte('created_at', windowStart);
    if ((recentCount || 0) >= 5) {
      return res.status(429).json({
        error: 'rate_limited',
        message: 'Too many reports. Please try again later.',
        version: VERSION,
      });
    }

    const { data: report, error } = await supabase
      .from('content_reports')
      .insert({
        reporter_id: userId,
        target_type: targetType,
        target_id: targetId,
        reason_category: reasonCategory || null,
        reason: reason.trim(),
        status: 'open',
      })
      .select('id')
      .single();
    const reportId = (report as { id?: string } | null)?.id;

    if (error) {
      console.warn('[ContentReports] Insert error:', error);
      // Unique constraint -> already reported
      if (String((error as any).code || '') === '23505') {
        return res.status(200).json({
          data: { id: reportId },
          message: 'Report already submitted.',
          version: VERSION,
        });
      }
      return res.status(503).json({
        error: 'Service Unavailable',
        message: 'Failed to submit report',
        version: VERSION,
      });
    }

    // Hide content immediately for reporter (best-effort)
    try {
      await supabase.from('content_hides').insert({
        user_id: userId,
        target_type: targetType,
        target_id: targetId,
      });
    } catch {
      // best-effort
    }

    return res.status(201).json({
      data: { id: reportId },
      message: 'Report submitted. Our team will review it.',
      version: VERSION,
    });
  } catch (err) {
    console.error('[ContentReports] Error:', err);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to submit report',
      version: VERSION,
    });
  }
});
