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

    const { data: report, error } = await supabase
      .from('content_reports')
      .insert({
        reporter_id: userId,
        target_type: targetType,
        target_id: targetId,
        reason_category: reasonCategory || null,
        reason: reason.trim(),
        status: 'pending',
      })
      .select('id')
      .single();

    if (error) {
      console.warn('[ContentReports] Insert error:', error);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to submit report',
        version: VERSION,
      });
    }

    return res.status(201).json({
      data: { id: report?.id },
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
