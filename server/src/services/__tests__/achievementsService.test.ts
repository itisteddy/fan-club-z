// @ts-nocheck
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock('../../utils/dbPool', () => ({
  ensureDbPool: jest.fn(),
}));

jest.mock('../../config/database', () => ({
  supabase: {},
}));

import { ensureDbPool } from '../../utils/dbPool';
import {
  computeBadgeEligibility,
  rankAwardScores,
  recomputeUserStatsDaily,
} from '../achievementsService';

function createPgPoolRecorder() {
  const calls: Array<{ sql: string; params?: any[] }> = [];
  const client = {
    query: jest.fn(async (sql: string, params?: any[]) => {
      calls.push({ sql: String(sql), params });
      const normalized = String(sql).replace(/\s+/g, ' ').trim().toUpperCase();
      if (normalized === 'BEGIN' || normalized === 'COMMIT' || normalized === 'ROLLBACK') {
        return { rows: [], rowCount: 0 };
      }
      return { rows: [], rowCount: 0 };
    }),
    release: jest.fn(),
  };
  return {
    pool: {
      connect: jest.fn(async () => client),
    },
    calls,
    client,
  };
}

describe('achievementsService.rankAwardScores', () => {
  it('ranks by score desc and breaks ties by userId', () => {
    const ranked = rankAwardScores([
      { userId: 'user-b', score: 10 },
      { userId: 'user-a', score: 10 },
      { userId: 'user-c', score: 3 },
    ]);

    expect(ranked).toEqual([
      { userId: 'user-a', score: 10, rank: 1 },
      { userId: 'user-b', score: 10, rank: 2 },
      { userId: 'user-c', score: 3, rank: 3 },
    ]);
  });
});

describe('achievementsService.computeBadgeEligibility', () => {
  it('awards only eligible permanent badges once per rule', () => {
    const result = computeBadgeEligibility([
      { userId: 'u1', stakesCount: 10, commentsCount: 1, creatorEarningsAmount: 2 },
      { userId: 'u2', stakesCount: 0, commentsCount: 0, creatorEarningsAmount: 0 },
    ]);

    expect(result).toEqual(
      expect.arrayContaining([
        { userId: 'u1', badgeKey: 'FIRST_STAKE' },
        { userId: 'u1', badgeKey: 'TEN_STAKES' },
        { userId: 'u1', badgeKey: 'FIRST_COMMENT' },
        { userId: 'u1', badgeKey: 'FIRST_CREATOR_EARNING' },
      ])
    );
    expect(result.find((r) => r.userId === 'u2')).toBeUndefined();
  });
});

describe('achievementsService.recomputeUserStatsDaily', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses UPSERT so reruns are idempotent for the same day range', async () => {
    const recorder = createPgPoolRecorder();
    (ensureDbPool as jest.Mock).mockResolvedValue(recorder.pool);

    const run1 = await recomputeUserStatsDaily({ startDay: '2026-02-20', endDay: '2026-02-20' });
    const run2 = await recomputeUserStatsDaily({ startDay: '2026-02-20', endDay: '2026-02-20' });

    expect(run1.processedDays).toBe(1);
    expect(run2.processedDays).toBe(1);

    const insertStatements = recorder.calls
      .map((c) => c.sql)
      .filter((sql) => sql.includes('INSERT INTO user_stats_daily'));

    expect(insertStatements.length).toBeGreaterThanOrEqual(2);
    expect(insertStatements[0]).toContain('ON CONFLICT (user_id, day)');
  });
});

