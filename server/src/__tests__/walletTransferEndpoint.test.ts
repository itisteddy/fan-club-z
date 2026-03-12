// @ts-nocheck
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import express from 'express';
import request from 'supertest';

jest.mock('../config/database', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      upsert: jest.fn().mockResolvedValue({ data: null, error: null }),
    })),
  },
}));

jest.mock('../services/walletReconciliation', () => ({
  reconcileWallet: jest.fn(async () => ({
    availableToStakeUSDC: 0,
    reservedUSDC: 0,
    escrowUSDC: 0,
    totalDepositedUSDC: 0,
    totalWithdrawnUSDC: 0,
    updatedAt: new Date().toISOString(),
    walletAddress: null,
    source: 'cached',
  })),
}));

jest.mock('../middleware/requireSupabaseAuth', () => ({
  requireSupabaseAuth: (req: any, res: any, next: any) => {
    const auth = String(req.headers.authorization || '');
    if (!auth.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'unauthorized', message: 'Authorization required' });
    }
    req.user = { id: 'user-1', email: 'u@example.com' };
    return next();
  },
}));

jest.mock('../services/walletBalanceAccounts', () => ({
  transferCreatorEarningsToStake: jest.fn(),
  getWalletBalanceAccountsSummary: jest.fn(),
  getCreatorEarningsMilestoneSummary: jest.fn(),
  listCreatorEarningsHistory: jest.fn(),
  WalletBalanceError: class WalletBalanceError extends Error {
    code: string;
    status: number;
    constructor(code: string, message: string, status = 400) {
      super(message);
      this.code = code;
      this.status = status;
    }
  },
}));

import { walletRead } from '../routes/walletRead';
import { supabase } from '../config/database';
import {
  transferCreatorEarningsToStake,
  getWalletBalanceAccountsSummary,
  getCreatorEarningsMilestoneSummary,
} from '../services/walletBalanceAccounts';
import {
  insertWalletTransactionCompat,
  recoverAndTopUpEntry,
  syncPredictionOptionStateFallback,
} from '../routes/predictions/placeBet';

const app = express();
app.use(express.json());
app.use('/api/wallet', walletRead);

describe('POST /api/wallet/transfer-creator-earnings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('requires auth', async () => {
    const res = await request(app)
      .post('/api/wallet/transfer-creator-earnings')
      .send({ amount: 5 });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('unauthorized');
  });

  it('validates payload', async () => {
    const res = await request(app)
      .post('/api/wallet/transfer-creator-earnings')
      .set('Authorization', 'Bearer fake')
      .send({ amount: 0 });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('invalid_body');
  });

  it('returns updated balances on success', async () => {
    (transferCreatorEarningsToStake as jest.Mock).mockResolvedValue({
      transactionId: 'tx_1',
      applied: true,
      balances: { creatorEarnings: 2, stakeBalance: 12, stakeReserved: 0 },
    });
    (getWalletBalanceAccountsSummary as jest.Mock).mockResolvedValue({
      demoCredits: 50,
      creatorEarnings: 2,
      stakeBalance: 12,
      stakeReserved: 0,
    });
    (getCreatorEarningsMilestoneSummary as jest.Mock).mockResolvedValue({
      cumulativeCredited: 12.5,
      first10ZaurumEarned: true,
      first10Label: 'First 10 Zaurum earned',
    });

    const res = await request(app)
      .post('/api/wallet/transfer-creator-earnings')
      .set('Authorization', 'Bearer fake')
      .send({ amount: 3, requestId: 'req_12345678' });

    expect(res.status).toBe(200);
    expect(transferCreatorEarningsToStake).toHaveBeenCalledWith({
      userId: 'user-1',
      amount: 3,
      requestId: 'req_12345678',
    });
    expect(res.body.ok).toBe(true);
    expect(res.body.applied).toBe(true);
    expect(res.body.balances).toEqual({
      demoCredits: 50,
      creatorEarnings: 2,
      stakeBalance: 12,
      creatorEarningsCumulative: 12.5,
    });
    expect(res.body.milestones).toEqual({
      first10ZaurumEarned: true,
      first10Label: 'First 10 Zaurum earned',
    });
  });
});

describe('A3.1 mutation integrity helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('recovers top-up update when updated_at column is missing', async () => {
    const selectCurrentChain: any = {
      select: jest.fn(),
      eq: jest.fn(),
      maybeSingle: jest.fn().mockResolvedValue({ data: { id: 'entry-1', amount: 10 }, error: null }),
    };
    selectCurrentChain.select.mockReturnValue(selectCurrentChain);
    selectCurrentChain.eq.mockReturnValue(selectCurrentChain);

    const updateFailChain: any = {
      update: jest.fn(),
      eq: jest.fn(),
      select: jest.fn(),
      maybeSingle: jest.fn().mockResolvedValue({
        data: null,
        error: { code: '42703', message: 'column prediction_entries.updated_at does not exist' },
      }),
    };
    updateFailChain.update.mockReturnValue(updateFailChain);
    updateFailChain.eq.mockReturnValue(updateFailChain);
    updateFailChain.select.mockReturnValue(updateFailChain);

    const updateSuccessChain: any = {
      update: jest.fn(),
      eq: jest.fn(),
      select: jest.fn(),
      maybeSingle: jest.fn().mockResolvedValue({ data: { id: 'entry-1', amount: 25 }, error: null }),
    };
    updateSuccessChain.update.mockReturnValue(updateSuccessChain);
    updateSuccessChain.eq.mockReturnValue(updateSuccessChain);
    updateSuccessChain.select.mockReturnValue(updateSuccessChain);

    (supabase.from as jest.Mock)
      .mockImplementationOnce(() => selectCurrentChain)
      .mockImplementationOnce(() => updateFailChain)
      .mockImplementationOnce(() => updateSuccessChain);

    const result = await recoverAndTopUpEntry({
      entryId: 'entry-1',
      userId: 'u1',
      predictionId: 'p1',
      optionId: 'o1',
      provider: 'demo-wallet',
      amountDelta: 15,
      estPayout: 40,
    });

    expect(result.error).toBeNull();
    expect(result.data?.id).toBe('entry-1');
    expect(result.data?.amount).toBe(25);
    expect((supabase.from as jest.Mock).mock.calls.length).toBe(3);
  });

  it('persists wallet transaction by retrying without unsupported entry_id column', async () => {
    const insertedPayloads: any[] = [];
    const firstInsert = jest.fn().mockImplementation(async (payload: any) => {
      insertedPayloads.push(payload);
      return { error: { code: '42703', message: 'column wallet_transactions.entry_id does not exist' } };
    });
    const secondInsert = jest.fn().mockImplementation(async (payload: any) => {
      insertedPayloads.push(payload);
      return { error: null };
    });
    (supabase.from as jest.Mock)
      .mockImplementationOnce(() => ({ insert: firstInsert }))
      .mockImplementationOnce(() => ({ insert: secondInsert }));

    const payload = {
      user_id: 'u1',
      type: 'bet_lock',
      amount: 10,
      entry_id: 'entry-1',
      prediction_id: 'p1',
    };
    const result = await insertWalletTransactionCompat(payload);

    expect(result.error).toBeNull();
    expect(insertedPayloads[0]).toMatchObject({ entry_id: 'entry-1', amount: 10 });
    expect(insertedPayloads[1]).toMatchObject({ amount: 10 });
    expect(insertedPayloads[1].entry_id).toBeUndefined();
  });

  it('syncs prediction option total_staked from active entries even when updated_at is missing', async () => {
    const optionUpdates: any[] = [];
    const predictionOptionsRows = [{ id: 'o1' }, { id: 'o2' }];
    const activeEntriesRows = [{ option_id: 'o1', amount: 10 }, { option_id: 'o1', amount: 15 }];
    const optionsQuery: any = { select: jest.fn(), eq: jest.fn() };
    optionsQuery.select.mockReturnValue(optionsQuery);
    optionsQuery.eq.mockResolvedValue({ data: predictionOptionsRows, error: null });

    const entriesQuery: any = { select: jest.fn(), eq: jest.fn() };
    entriesQuery.select.mockReturnValue(entriesQuery);
    entriesQuery.eq
      .mockImplementationOnce(() => entriesQuery)
      .mockResolvedValueOnce({ data: activeEntriesRows, error: null });

    const makeUpdateQuery = () => ({
      update: (patch: any) => {
        optionUpdates.push(patch);
        return {
          eq: async () =>
            patch.updated_at
              ? { error: { code: '42703', message: 'column prediction_options.updated_at does not exist' } }
              : { error: null },
        };
      },
    });

    (supabase.from as jest.Mock)
      .mockImplementationOnce(() => optionsQuery)
      .mockImplementationOnce(() => entriesQuery)
      .mockImplementation(() => makeUpdateQuery());

    await syncPredictionOptionStateFallback('p1');

    const o1WithoutUpdatedAt = optionUpdates.find((p) => p.total_staked === 25 && !('updated_at' in p));
    const o2WithoutUpdatedAt = optionUpdates.find((p) => p.total_staked === 0 && !('updated_at' in p));
    expect(o1WithoutUpdatedAt).toBeTruthy();
    expect(o2WithoutUpdatedAt).toBeTruthy();
  });
});
