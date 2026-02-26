import { Router } from 'express';
import { z } from 'zod';
import { VERSION } from '@fanclubz/shared';
import { recomputeStatsAndAwards, type AwardWindow } from '../../services/achievementsService';
import { getFallbackAdminActorId, logAdminAction } from './audit';

export const achievementsAdminRouter = Router();

const BodySchema = z.object({
  startDay: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDay: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  daysBack: z.coerce.number().int().min(0).max(365).optional(),
  topN: z.coerce.number().int().min(1).max(500).optional(),
  windows: z.array(z.enum(['7d', '30d', 'all'])).optional(),
  actorId: z.string().uuid().optional(),
}).optional();

achievementsAdminRouter.post('/recompute', async (req, res) => {
  try {
    const parsed = BodySchema.safeParse(req.body || {});
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid body',
        details: parsed.error.issues,
        version: VERSION,
      });
    }

    const body = parsed.data || {};
    const result = await recomputeStatsAndAwards({
      startDay: body.startDay,
      endDay: body.endDay,
      daysBack: body.daysBack,
      topN: body.topN,
      windows: body.windows as AwardWindow[] | undefined,
    });

    const actorId = body.actorId || getFallbackAdminActorId();
    if (actorId) {
      await logAdminAction({
        actorId,
        action: 'achievements.recompute',
        targetType: 'achievements',
        reason: 'manual_recompute',
        meta: {
          startDay: body.startDay || null,
          endDay: body.endDay || null,
          daysBack: body.daysBack ?? null,
          topN: body.topN ?? null,
          windows: body.windows || null,
          result,
        },
      });
    }

    return res.json({
      ok: true,
      data: result,
      version: VERSION,
    });
  } catch (error: any) {
    console.error('[Admin][Achievements] recompute failed:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: error?.message || 'Failed to recompute achievements',
      version: VERSION,
    });
  }
});
