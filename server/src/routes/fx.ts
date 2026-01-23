/**
 * Phase 7D: FX rates endpoint – display-only NGNUSD.
 * GET /api/v2/fx/ngn-usd
 */

import { Router } from 'express';
import { VERSION } from '@fanclubz/shared';
import { getNgnUsdRate } from '../services/FxRateService';

export const fxRouter = Router();

fxRouter.get('/ngn-usd', async (_req, res) => {
  try {
    const fx = await getNgnUsdRate();
    return res.json({ ...fx, version: VERSION });
  } catch (e) {
    console.warn('[FX] /ngn-usd error:', (e as Error)?.message);
    return res.status(503).json({
      pair: 'NGNUSD',
      rate: null,
      source: 'none',
      asOf: null,
      retrievedAt: null,
      isStale: true,
      error: 'FX temporarily unavailable',
      version: VERSION,
    });
  }
});
