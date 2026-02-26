// @ts-nocheck
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import express from 'express';
import request from 'supertest';

jest.mock('../middleware/requireSupabaseAuth', () => ({
  requireSupabaseAuth: (req: any, res: any, next: any) => {
    const auth = String(req.headers.authorization || '');
    if (!auth.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'unauthorized', message: 'Authorization required' });
    }
    req.user = { id: 'user-1', email: 'user@example.com' };
    return next();
  },
}));

jest.mock('../services/stakeQuote', () => ({
  StakeQuoteError: class StakeQuoteError extends Error {
    status: number;
    code: string;
    constructor(code: string, message: string, status = 400) {
      super(message);
      this.code = code;
      this.status = status;
    }
  },
  computeStakeQuoteFromDb: jest.fn(),
  insertPositionStakeEvent: jest.fn(),
}));

jest.mock('../config/database', () => ({
  supabase: { from: jest.fn() },
}));

jest.mock('../services/predictionMath', () => ({
  recomputePredictionState: jest.fn(),
}));

jest.mock('../services/realtime', () => ({
  emitPredictionUpdate: jest.fn(),
}));

import predictionsRouter from '../routes/predictions';
import { computeStakeQuoteFromDb } from '../services/stakeQuote';

const app = express();
app.use(express.json());
app.use('/api/v2/predictions', predictionsRouter);

describe('GET /api/v2/predictions/:id/quote', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('requires auth', async () => {
    const res = await request(app).get('/api/v2/predictions/pred-1/quote?outcomeId=out-1&amount=10');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('unauthorized');
  });

  it('returns quote using authenticated user and mode', async () => {
    (computeStakeQuoteFromDb as jest.Mock).mockResolvedValue({
      quote: {
        marketId: 'pred-1',
        outcomeId: 'out-1',
        amount: 10,
        pricingModel: 'pool_parimutuel',
        current: { userStake: 5, oddsOrPrice: 2.1, estPayout: 10.5 },
        after: { userStake: 15, oddsOrPrice: 1.8, estPayout: 27 },
        disclaimer: 'Estimated; final payout depends on final pools at close.',
      },
      otherOutcomeEntry: null,
    });

    const res = await request(app)
      .get('/api/v2/predictions/pred-1/quote?outcomeId=out-1&amount=10&mode=demo')
      .set('Authorization', 'Bearer fake');

    expect(res.status).toBe(200);
    expect(computeStakeQuoteFromDb).toHaveBeenCalledWith({
      predictionId: 'pred-1',
      optionId: 'out-1',
      amount: 10,
      userId: 'user-1',
      mode: 'DEMO',
    });
    expect(res.body.ok).toBe(true);
    expect(res.body.quote.after.userStake).toBe(15);
  });

  it('returns conflict when user already has opposite outcome position', async () => {
    (computeStakeQuoteFromDb as jest.Mock).mockResolvedValue({
      quote: {},
      otherOutcomeEntry: { id: 'entry-conflict' },
    });

    const res = await request(app)
      .get('/api/v2/predictions/pred-1/quote?outcomeId=out-2&amount=12')
      .set('Authorization', 'Bearer fake');

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('conflicting_position');
  });
});

