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
    req.user = { id: 'me-user' };
    return next();
  },
  requireSupabaseAuthAllowDeleted: (req: any, res: any, next: any) => {
    const auth = String(req.headers.authorization || '');
    if (!auth.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'unauthorized', message: 'Authorization required' });
    }
    req.user = { id: 'me-user' };
    return next();
  },
}));

jest.mock('../services/achievementsService', () => ({
  getUserAchievements: jest.fn(),
}));

jest.mock('../config/database', () => ({
  supabase: { from: jest.fn() },
}));

import usersRouter from '../routes/users';
import { meRouter } from '../routes/me';
import { getUserAchievements } from '../services/achievementsService';

const app = express();
app.use(express.json());
app.use('/api/v2/users', usersRouter);
app.use('/api/me', meRouter);

describe('achievements endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getUserAchievements as jest.Mock).mockResolvedValue({
      userId: 'user-123',
      awards: [
        {
          awardKey: 'TOP_CREATOR',
          title: 'Top Creator',
          description: 'Highest creator earnings.',
          iconKey: 'creator',
          metric: 'creator_earnings_amount',
          window: '7d',
          rank: 2,
          score: 120.25,
          computedAt: '2026-02-26T00:00:00.000Z',
        },
      ],
      badges: [
        {
          badgeKey: 'FIRST_STAKE',
          title: 'First Stake',
          description: 'Placed your first stake.',
          iconKey: 'target',
          earnedAt: '2026-02-20T00:00:00.000Z',
          metadata: {},
        },
      ],
      version: 'test',
    });
  });

  it('returns public profile achievements for another user', async () => {
    const res = await request(app).get('/api/v2/users/user-123/achievements');
    expect(res.status).toBe(200);
    expect(getUserAchievements).toHaveBeenCalledWith('user-123');
    expect(res.body.data).toMatchObject({
      userId: 'user-123',
      awards: expect.any(Array),
      badges: expect.any(Array),
    });
  });

  it('requires auth for /api/me/achievements', async () => {
    const res = await request(app).get('/api/me/achievements');
    expect(res.status).toBe(401);
  });

  it('returns my achievements when authenticated', async () => {
    const res = await request(app)
      .get('/api/me/achievements')
      .set('Authorization', 'Bearer fake');

    expect(res.status).toBe(200);
    expect(getUserAchievements).toHaveBeenCalledWith('me-user');
    expect(res.body.data.awards[0]).toMatchObject({
      awardKey: 'TOP_CREATOR',
      window: '7d',
      rank: 2,
    });
  });
});
