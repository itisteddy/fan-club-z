import { Router } from 'express';
import { VERSION } from '@fanclubz/shared';
import { requireSupabaseAuth } from '../middleware/requireSupabaseAuth';
import type { AuthenticatedRequest } from '../middleware/auth';
import { getUserAchievements } from '../services/achievementsService';

export const meRouter = Router();

meRouter.get('/achievements', requireSupabaseAuth as any, async (req, res) => {
  try {
    const userId = String((req as AuthenticatedRequest).user?.id || '');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Authorization required', version: VERSION });
    }
    const data = await getUserAchievements(userId);
    return res.json({ data, message: 'Achievements fetched successfully', version: VERSION });
  } catch (error: any) {
    console.error('[Me] achievements error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error?.message || 'Failed to fetch achievements',
      version: VERSION,
    });
  }
});
