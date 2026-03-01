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
    walletAccounts: {
      PROMO_AVAILABLE: Number(initial.available_balance || 0),
      PROMO_LOCKED: Number(initial.reserved_balance || 0),
      CREATOR_EARNINGS: Number(initial.creator_earnings_balance || 0),
      CASH_AVAILABLE: 0,
      CASH_LOCKED: 0,
      WITHDRAWABLE: 0,
    } as Record<string, number>,
    ledger: [] as any[],
  };

  let rowLockDepth = 0;
  const acquireLock = async () => {
    rowLockDepth += 1;
  };
  const releaseLock = () => {
    rowLockDepth = Math.max(0, rowLockDepth - 1);
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
            if (sql.includes(`'DEMO_USD'`) && params && params.length >= 3) {
              state.wallet.available_balance = Number(params[1]);
              state.wallet.reserved_balance = Number(params[2]);
              state.walletAccounts.PROMO_AVAILABLE = Number(params[1]);
              state.walletAccounts.PROMO_LOCKED = Number(params[2]);
            }
            if (sql.includes(`'USD'`) && params && params.length >= 2) {
              state.wallet.creator_earnings_balance = Number(params[1]);
              state.walletAccounts.CREATOR_EARNINGS = Number(params[1]);
            }
            return { rows: [], rowCount: 1 };
          }

          if (normalized.startsWith('INSERT INTO WALLET_ACCOUNTS')) {
            return { rows: [], rowCount: 1 };
          }

          if (normalized.startsWith('SELECT BUCKET, BALANCE FROM WALLET_ACCOUNTS')) {
            const rows = Object.entries(state.walletAccounts).map(([bucket, balance]) => ({ bucket, balance }));
            return { rows, rowCount: rows.length };
          }

          if (normalized.startsWith('UPDATE WALLET_ACCOUNTS')) {
            const bucket = String(params?.[3] || '');
            state.walletAccounts[bucket] = Number(params?.[4] || 0);
            return { rows: [], rowCount: 1 };
          }

          if (normalized.startsWith('INSERT INTO WALLET_LEDGER')) {
            const id = `ledger_${state.ledger.length + 1}`;
            state.ledger.push({ id, params });
            return { rows: [{ id, created_at: new Date().toISOString() }], rowCount: 1 };
          }

          if (normalized.includes('FROM WALLETS') && normalized.includes('FOR UPDATE')) {
            await acquireLock();
            holdsLock = true;
            return { rows: [{ ...state.wallet }], rowCount: 1 };
          }

          if (normalized.includes('FROM WALLET_ACCOUNTS') && normalized.includes('FOR UPDATE')) {
            await acquireLock();
            holdsLock = true;
            const bucket = String(params?.[3] || '');
            return { rows: [{ balance: Number(state.walletAccounts[bucket] || 0) }], rowCount: 1 };
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
              state.walletAccounts.CREATOR_EARNINGS = Number(params[2]);
              state.walletAccounts.PROMO_AVAILABLE = Number(params[4]);
              return { rows: [], rowCount: 1 };
            }
            // Credit update path includes creator only.
            if (params && params.length >= 3) {
              state.wallet.creator_earnings_balance = Number(params[2]);
              state.walletAccounts.CREATOR_EARNINGS = Number(params[2]);
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

  it('rejects a second transfer once funds are consumed', async () => {
    const pool = createFakePgPool({
      available_balance: 15,
      reserved_balance: 0,
      creator_earnings_balance: 10,
      stake_balance: 15,
    });
    (ensureDbPool as jest.Mock).mockResolvedValue(pool);

    await transferCreatorEarningsToStake({ userId: 'u1', amount: 6 });
    await expect(
      transferCreatorEarningsToStake({ userId: 'u1', amount: 6 })
    ).rejects.toMatchObject({ code: 'INSUFFICIENT_CREATOR_EARNINGS' });
    expect(pool.__state.wallet.creator_earnings_balance).toBe(4);
    expect(pool.__state.walletAccounts.PROMO_AVAILABLE).toBe(21);
    expect(pool.__state.txs).toHaveLength(1); // wallet_transaction row only on successful transfer
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
