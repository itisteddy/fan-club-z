// @ts-nocheck
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock('../utils/dbPool', () => ({
  ensureDbPool: jest.fn(),
}));

import { ensureDbPool } from '../utils/dbPool';
import { credit, debit, transfer, WalletServiceError } from '../services/walletService';

function createPool() {
  const state = {
    accounts: new Map<string, number>(),
    ledger: [] as any[],
  };

  const key = (ownerType: string, ownerId: string, bucket: string) => `${ownerType}:${ownerId}:${bucket}`;

  const lockMap = new Map<string, boolean>();
  const waiters = new Map<string, Array<() => void>>();

  const acquire = async (k: string) => {
    if (!lockMap.get(k)) {
      lockMap.set(k, true);
      return;
    }
    await new Promise<void>((resolve) => {
      const arr = waiters.get(k) || [];
      arr.push(resolve);
      waiters.set(k, arr);
    });
    lockMap.set(k, true);
  };

  const release = (k: string) => {
    lockMap.set(k, false);
    const arr = waiters.get(k) || [];
    const next = arr.shift();
    waiters.set(k, arr);
    if (next) next();
  };

  const pool = {
    connect: jest.fn(async () => {
      const held: string[] = [];
      return {
        query: jest.fn(async (sql: string, params?: any[]) => {
          const normalized = sql.replace(/\s+/g, ' ').trim().toUpperCase();
          if (normalized === 'BEGIN' || normalized === 'COMMIT' || normalized === 'ROLLBACK') {
            if (normalized !== 'BEGIN') {
              for (const h of held.splice(0, held.length)) release(h);
            }
            return { rows: [], rowCount: 0 };
          }

          if (normalized.startsWith('INSERT INTO WALLET_ACCOUNTS')) {
            const k = key(params[0], params[1], params[3]);
            if (!state.accounts.has(k)) state.accounts.set(k, 0);
            return { rows: [], rowCount: 1 };
          }

          if (normalized.includes('FROM WALLET_ACCOUNTS') && normalized.includes('FOR UPDATE')) {
            const k = key(params[0], params[1], params[3]);
            await acquire(k);
            held.push(k);
            if (!state.accounts.has(k)) state.accounts.set(k, 0);
            return { rows: [{ balance: state.accounts.get(k) }], rowCount: 1 };
          }

          if (normalized.startsWith('UPDATE WALLET_ACCOUNTS')) {
            const k = key(params[0], params[1], params[3]);
            state.accounts.set(k, Number(params[4]));
            return { rows: [], rowCount: 1 };
          }

          if (normalized.startsWith('INSERT INTO WALLET_LEDGER')) {
            const id = `ledger_${state.ledger.length + 1}`;
            state.ledger.push({ id, params });
            return { rows: [{ id, created_at: new Date().toISOString() }], rowCount: 1 };
          }

          if (normalized.startsWith('SELECT BUCKET, BALANCE FROM WALLET_ACCOUNTS')) {
            const ownerId = params[0];
            const rows = Array.from(state.accounts.entries())
              .filter(([k]) => k.startsWith(`user:${ownerId}:`))
              .map(([k, balance]) => ({ bucket: k.split(':')[2], balance }));
            return { rows, rowCount: rows.length };
          }

          if (normalized.startsWith('INSERT INTO WALLETS')) {
            return { rows: [], rowCount: 1 };
          }

          throw new Error(`Unhandled SQL: ${sql}`);
        }),
        release: jest.fn(),
      };
    }),
    __state: state,
  } as any;

  return pool;
}

describe('walletService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('transfer fails on insufficient funds', async () => {
    const pool = createPool();
    (ensureDbPool as jest.Mock).mockResolvedValue(pool);

    await expect(
      transfer({
        from: { ownerType: 'user', ownerId: 'u1', bucket: 'PROMO_AVAILABLE' },
        to: { ownerType: 'user', ownerId: 'u1', bucket: 'PROMO_LOCKED' },
        amount: 5,
        reference: { type: 'STAKE_LOCK', referenceType: 'test', referenceId: 'r1' },
      })
    ).rejects.toBeInstanceOf(WalletServiceError);
  });

  it('credit + transfer writes ledger rows and updates balances', async () => {
    const pool = createPool();
    (ensureDbPool as jest.Mock).mockResolvedValue(pool);

    await credit({
      to: { ownerType: 'user', ownerId: 'u1', bucket: 'PROMO_AVAILABLE' },
      amount: 20,
      reference: { type: 'DAILY_CLAIM', referenceType: 'test', referenceId: 'claim-1' },
    });

    await transfer({
      from: { ownerType: 'user', ownerId: 'u1', bucket: 'PROMO_AVAILABLE' },
      to: { ownerType: 'user', ownerId: 'u1', bucket: 'PROMO_LOCKED' },
      amount: 7,
      reference: { type: 'STAKE_LOCK', referenceType: 'test', referenceId: 'stake-1' },
    });

    expect(pool.__state.accounts.get('user:u1:PROMO_AVAILABLE')).toBe(13);
    expect(pool.__state.accounts.get('user:u1:PROMO_LOCKED')).toBe(7);
    expect(pool.__state.ledger.length).toBe(2);
  });

  it('concurrent debits do not allow negative balances', async () => {
    const pool = createPool();
    (ensureDbPool as jest.Mock).mockResolvedValue(pool);

    await credit({
      to: { ownerType: 'user', ownerId: 'u1', bucket: 'PROMO_LOCKED' },
      amount: 10,
      reference: { type: 'ADJUSTMENT', referenceType: 'test', referenceId: 'seed-1' },
    });

    const p1 = debit({
      from: { ownerType: 'user', ownerId: 'u1', bucket: 'PROMO_LOCKED' },
      amount: 6,
      reference: { type: 'STAKE_UNLOCK', referenceType: 'test', referenceId: 'd1' },
    });
    const p2 = debit({
      from: { ownerType: 'user', ownerId: 'u1', bucket: 'PROMO_LOCKED' },
      amount: 6,
      reference: { type: 'STAKE_UNLOCK', referenceType: 'test', referenceId: 'd2' },
    });

    const results = await Promise.allSettled([p1, p2]);
    const success = results.filter((r) => r.status === 'fulfilled');
    const failed = results.filter((r) => r.status === 'rejected');

    expect(success).toHaveLength(1);
    expect(failed).toHaveLength(1);
    expect((failed[0] as PromiseRejectedResult).reason).toBeInstanceOf(WalletServiceError);
    expect(pool.__state.accounts.get('user:u1:PROMO_LOCKED')).toBe(4);
  });
});
