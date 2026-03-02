// @ts-nocheck
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock('../utils/dbPool', () => ({
  ensureDbPool: jest.fn(),
}));

jest.mock('../config/database', () => ({
  supabase: {},
}));

import { ensureDbPool } from '../utils/dbPool';
import { creditCreatorEarnings, transferCreatorEarningsToStake, WalletBalanceError } from '../services/walletBalanceAccounts';

type WalletRow = {
  available_balance: number;
  reserved_balance: number;
  creator_earnings_balance: number;
  stake_balance: number;
};

function createFakePgPool(initial: WalletRow) {
  const state = {
    wallet: { ...initial },
    txs: [] as any[],
    walletRowExists: false,
  };

  let rowLockHeld = false;
  const waiters: Array<() => void> = [];

  const acquireLock = async () => {
    if (!rowLockHeld) {
      rowLockHeld = true;
      return;
    }
    await new Promise<void>((resolve) => waiters.push(resolve));
    rowLockHeld = true;
  };

  const releaseLock = () => {
    rowLockHeld = false;
    const next = waiters.shift();
    if (next) next();
  };

  const pool = {
    connect: jest.fn(async () => {
      let inTx = false;
      let holdsLock = false;
      return {
        query: jest.fn(async (sql: string, params?: any[]) => {
          const normalized = sql.replace(/\s+/g, ' ').trim().toUpperCase();
          if (normalized === 'BEGIN') {
            inTx = true;
            return { rows: [], rowCount: 0 };
          }
          if (normalized === 'COMMIT') {
            inTx = false;
            if (holdsLock) {
              holdsLock = false;
              releaseLock();
            }
            return { rows: [], rowCount: 0 };
          }
          if (normalized === 'ROLLBACK') {
            inTx = false;
            if (holdsLock) {
              holdsLock = false;
              releaseLock();
            }
            return { rows: [], rowCount: 0 };
          }

          if (normalized.startsWith('INSERT INTO WALLETS')) {
            state.walletRowExists = true;
            return { rows: [], rowCount: 1 };
          }

          if (normalized.includes('FROM WALLETS') && normalized.includes('FOR UPDATE')) {
            await acquireLock();
            holdsLock = true;
            return { rows: [{ ...state.wallet }], rowCount: 1 };
          }

          if (normalized.startsWith('SELECT CREATOR_EARNINGS_BALANCE')) {
            return { rows: [{ ...state.wallet }], rowCount: 1 };
          }

          if (normalized.startsWith('UPDATE WALLETS')) {
            // Transfer update path includes creator/stake/available.
            if (params && params.length >= 5) {
              state.wallet.creator_earnings_balance = Number(params[2]);
              state.wallet.stake_balance = Number(params[3]);
              state.wallet.available_balance = Number(params[4]);
              return { rows: [], rowCount: 1 };
            }
            // Credit update path includes creator only.
            if (params && params.length >= 3) {
              state.wallet.creator_earnings_balance = Number(params[2]);
              return { rows: [], rowCount: 1 };
            }
            return { rows: [], rowCount: 0 };
          }

          if (normalized.startsWith('INSERT INTO WALLET_TRANSACTIONS')) {
            // creditCreatorEarnings uses ON CONFLICT DO NOTHING
            const provider = params?.[1];
            const externalRef = params?.[4] ?? params?.[3];
            const duplicate = state.txs.find((t) => t.provider === provider && t.externalRef === externalRef);
            if (normalized.includes('ON CONFLICT') && duplicate) {
              return { rows: [], rowCount: 0 };
            }
            const tx = {
              id: `tx_${state.txs.length + 1}`,
              provider,
              externalRef,
              amount: Number(params?.[2] ?? params?.[1] ?? 0),
            };
            state.txs.push(tx);
            return { rows: [{ id: tx.id, created_at: new Date().toISOString() }], rowCount: 1 };
          }

          throw new Error(`Unhandled SQL in fake pool: ${sql}`);
        }),
        release: jest.fn(),
      };
    }),
    __state: state,
  } as any;

  return pool;
}

describe('walletBalanceAccounts.transferCreatorEarningsToStake', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects non-positive amount', async () => {
    await expect(
      transferCreatorEarningsToStake({ userId: 'u1', amount: 0 })
    ).rejects.toMatchObject({ code: 'INVALID_AMOUNT' });
  });

  it('rejects when amount exceeds creator earnings', async () => {
    (ensureDbPool as jest.Mock).mockResolvedValue(
      createFakePgPool({
        available_balance: 10,
        reserved_balance: 0,
        creator_earnings_balance: 5,
        stake_balance: 10,
      })
    );

    await expect(
      transferCreatorEarningsToStake({ userId: 'u1', amount: 6 })
    ).rejects.toMatchObject({ code: 'INSUFFICIENT_CREATOR_EARNINGS' });
  });

  it('moves creator earnings to stake balance and writes a ledger row', async () => {
    const pool = createFakePgPool({
      available_balance: 20,
      reserved_balance: 3,
      creator_earnings_balance: 12,
      stake_balance: 20,
    });
    (ensureDbPool as jest.Mock).mockResolvedValue(pool);

    const result = await transferCreatorEarningsToStake({ userId: 'u1', amount: 7.5 });

    expect(result.balances.creatorEarnings).toBe(4.5);
    expect(result.balances.stakeBalance).toBe(27.5);
    expect(result.balances.stakeReserved).toBe(3);
    expect(pool.__state.wallet.available_balance).toBe(27.5);
    expect(pool.__state.txs).toHaveLength(1);
  });

  it('simulates concurrent transfers and allows only one when funds become insufficient', async () => {
    const pool = createFakePgPool({
      available_balance: 15,
      reserved_balance: 0,
      creator_earnings_balance: 10,
      stake_balance: 15,
    });
    (ensureDbPool as jest.Mock).mockResolvedValue(pool);

    const p1 = transferCreatorEarningsToStake({ userId: 'u1', amount: 6 });
    const p2 = transferCreatorEarningsToStake({ userId: 'u1', amount: 6 });

    const results = await Promise.allSettled([p1, p2]);
    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(WalletBalanceError);
    expect((rejected[0] as PromiseRejectedResult).reason.code).toBe('INSUFFICIENT_CREATOR_EARNINGS');
    expect(pool.__state.wallet.creator_earnings_balance).toBe(4);
    expect(pool.__state.wallet.stake_balance).toBe(21);
    expect(pool.__state.txs).toHaveLength(1);
  });
});

describe('walletBalanceAccounts.creditCreatorEarnings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('credits creator earnings once and is idempotent on duplicate external_ref', async () => {
    const pool = createFakePgPool({
      available_balance: 5,
      reserved_balance: 0,
      creator_earnings_balance: 2,
      stake_balance: 5,
    });
    (ensureDbPool as jest.Mock).mockResolvedValue(pool);

    const args = {
      userId: 'u1',
      amount: 3,
      description: 'Creator earnings',
      provider: 'demo-wallet',
      externalRef: 'demo_creator_fee:pred1',
      predictionId: 'pred1',
    };

    const first = await creditCreatorEarnings(args);
    const second = await creditCreatorEarnings(args);

    expect(first.applied).toBe(true);
    expect(second.applied).toBe(false);
    expect(pool.__state.wallet.creator_earnings_balance).toBe(5);
    expect(pool.__state.txs).toHaveLength(1);
  });
});
