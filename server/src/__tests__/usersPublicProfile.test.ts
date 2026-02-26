// @ts-nocheck
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import express from 'express';
import request from 'supertest';

jest.mock('../services/achievementsService', () => ({
  getUserAchievements: jest.fn(),
}));

jest.mock('../config/database', () => ({
  supabase: { from: jest.fn() },
}));

import usersRouter from '../routes/users';
import { supabase } from '../config/database';
import { getUserAchievements } from '../services/achievementsService';

const app = express();
app.use(express.json());
app.use('/api/v2/users', usersRouter);

function usersResolveChain(result: any) {
  return {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValue(result),
  };
}

function usersSingleChain(result: any) {
  return {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue(result),
  };
}

function tableQueryChain(result: any) {
  return {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockResolvedValue(result),
  };
}

describe('users public profile endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getUserAchievements as jest.Mock).mockResolvedValue({
      userId: 'user-1',
      awardDefinitions: [],
      awards: [],
      badgeDefinitions: [],
      badgesEarned: [],
      badges: [],
    });
  });

  it('returns 404 for unknown handle on resolve', async () => {
    (supabase.from as jest.Mock).mockImplementation((table: string) => {
      if (table === 'users') return usersResolveChain({ data: null, error: null });
      throw new Error(`unexpected table ${table}`);
    });

    const res = await request(app).get('/api/v2/users/resolve?handle=unknown');
    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/not found/i);
  });

  it('returns safe public profile payload without private fields', async () => {
    (supabase.from as jest.Mock).mockImplementation((table: string) => {
      if (table === 'users') {
        return usersSingleChain({
          data: {
            id: 'user-1',
            username: 'alice',
            full_name: 'Alice Doe',
            avatar_url: 'https://cdn.example/avatar.png',
            created_at: '2026-02-01T00:00:00.000Z',
            og_badge: 'gold',
            og_badge_assigned_at: '2026-02-02T00:00:00.000Z',
            email: 'should-not-leak@example.com',
            referral_code: 'SECRET',
          },
          error: null,
        });
      }
      if (table === 'predictions') {
        return tableQueryChain({
          data: [{ id: 'p1', status: 'open', pool_total: 150 }],
          count: 1,
          error: null,
        });
      }
      if (table === 'prediction_entries') {
        return tableQueryChain({
          data: [
            { id: 'e1', status: 'won', amount: 10, actual_payout: 18 },
            { id: 'e2', status: 'active', amount: 5, actual_payout: null },
          ],
          count: 2,
          error: null,
        });
      }
      throw new Error(`unexpected table ${table}`);
    });

    const res = await request(app).get('/api/v2/users/user-1/public-profile');
    expect(res.status).toBe(200);

    expect(res.body.data).toMatchObject({
      user: {
        id: 'user-1',
        handle: 'alice',
        displayName: 'Alice Doe',
      },
      stats: {
        predictionsCreated: 1,
        predictionsParticipated: 2,
        activeStakes: 1,
        completedEntries: 1,
        wonEntries: 1,
      },
      achievements: expect.any(Object),
      recentActivity: [],
    });

    expect(res.body.data.user.email).toBeUndefined();
    expect(res.body.data.user.referral_code).toBeUndefined();
    expect(res.body.data.user.wallet_address).toBeUndefined();
    expect(res.body.data.user.admin).toBeUndefined();
  });
});

