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
import {
  transferCreatorEarningsToStake,
  getWalletBalanceAccountsSummary,
} from '../services/walletBalanceAccounts';

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
      balances: { creatorEarnings: 2, stakeBalance: 12, stakeReserved: 0 },
    });
    (getWalletBalanceAccountsSummary as jest.Mock).mockResolvedValue({
      demoCredits: 50,
      creatorEarnings: 2,
      stakeBalance: 12,
      stakeReserved: 0,
    });

    const res = await request(app)
      .post('/api/wallet/transfer-creator-earnings')
      .set('Authorization', 'Bearer fake')
      .send({ amount: 3 });

    expect(res.status).toBe(200);
    expect(transferCreatorEarningsToStake).toHaveBeenCalledWith({ userId: 'user-1', amount: 3 });
    expect(res.body.ok).toBe(true);
    expect(res.body.balances).toEqual({
      demoCredits: 50,
      creatorEarnings: 2,
      stakeBalance: 12,
    });
  });
});
