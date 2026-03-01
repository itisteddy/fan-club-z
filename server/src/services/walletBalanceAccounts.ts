import { ensureDbPool } from '../utils/dbPool';
import { supabase } from '../config/database';
import { logMoneyMutation } from '../utils/moneyMutationLogger';
import {
  credit,
  debit,
  getBalances,
  transfer,
  WalletServiceError,
} from './walletService';

const USD_CURRENCY = 'USD';
const DEMO_CURRENCY = 'DEMO_USD';

export type BalanceAccountsSummary = {
  demoCredits: number;
  creatorEarnings: number;
  stakeBalance: number;
  stakeReserved: number;
};

export class WalletBalanceError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

function round8(value: number): number {
  return Math.round((Number(value) || 0) * 1e8) / 1e8;
}

function toNumber(value: unknown): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

async function readZauBalancesFromClient(client: any, userId: string) {
  const rows = await client.query(
    `SELECT bucket, balance
     FROM wallet_accounts
     WHERE owner_type = 'user' AND owner_id = $1 AND currency = 'ZAU'`,
    [userId]
  );
  let promoAvailable = 0;
  let promoLocked = 0;
  let creatorEarnings = 0;
  for (const row of rows.rows || []) {
    const bucket = String(row.bucket || '');
    const balance = round8(toNumber(row.balance));
    if (bucket === 'PROMO_AVAILABLE') promoAvailable = balance;
    if (bucket === 'PROMO_LOCKED') promoLocked = balance;
    if (bucket === 'CREATOR_EARNINGS') creatorEarnings = balance;
  }
  return { promoAvailable, promoLocked, creatorEarnings };
}

async function ensureWalletRowPg(client: any, userId: string, currency: string) {
  await client.query(
    `INSERT INTO wallets (user_id, currency, available_balance, reserved_balance, demo_credits_balance, creator_earnings_balance, stake_balance, updated_at)
     VALUES ($1, $2, 0, 0, 0, 0, 0, NOW())
     ON CONFLICT (user_id, currency) DO NOTHING`,
    [userId, currency]
  );
}

export async function getWalletBalanceAccountsSummary(userId: string): Promise<BalanceAccountsSummary> {
  try {
    const balances = await getBalances(userId);
    return {
      demoCredits: round8(balances.PROMO_AVAILABLE),
      creatorEarnings: round8(balances.CREATOR_EARNINGS),
      stakeBalance: round8(balances.PROMO_AVAILABLE),
      stakeReserved: round8(balances.PROMO_LOCKED),
    };
  } catch {
    // Fallback to legacy wallet table if ledger table isn't available yet.
  }

  const { data: wallets, error } = await supabase
    .from('wallets')
    .select('currency, available_balance, reserved_balance, demo_credits_balance, creator_earnings_balance, stake_balance')
    .eq('user_id', userId)
    .in('currency', [USD_CURRENCY, DEMO_CURRENCY]);

  if (error) {
    throw error;
  }

  const usd = (wallets || []).find((row: any) => row.currency === USD_CURRENCY) as any;
  const demo = (wallets || []).find((row: any) => row.currency === DEMO_CURRENCY) as any;

  return {
    demoCredits: round8(toNumber(demo?.demo_credits_balance ?? demo?.available_balance)),
    creatorEarnings: round8(toNumber(usd?.creator_earnings_balance)),
    stakeBalance: round8(toNumber(usd?.stake_balance ?? usd?.available_balance)),
    stakeReserved: round8(toNumber(usd?.reserved_balance)),
  };
}

export async function creditCreatorEarnings(args: {
  userId: string;
  amount: number;
  description: string;
  provider: string;
  externalRef: string;
  predictionId?: string | null;
  referenceType?: string | null;
  referenceId?: string | null;
  currency?: string;
  metadata?: Record<string, unknown>;
}) {
  const amount = round8(args.amount);
  if (!(amount > 0)) {
    throw new WalletBalanceError('INVALID_AMOUNT', 'Creator earnings credit amount must be greater than zero');
  }

  const pool = await ensureDbPool();
  if (!pool) {
    throw new WalletBalanceError('DB_TX_UNAVAILABLE', 'Database transaction pool is unavailable', 503);
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await ensureWalletRowPg(client, args.userId, USD_CURRENCY);

    const txInsert = await client.query(
      `INSERT INTO wallet_transactions (
         user_id, direction, type, channel, provider, amount, currency, status, external_ref,
         prediction_id, description, meta, metadata, from_account, to_account, reference_type, reference_id, created_at
       ) VALUES (
         $1, 'credit', 'deposit', 'creator_fee', $2, $3, $4, 'completed', $5,
         $6, $7, $8::jsonb, $9::jsonb, 'SYSTEM', 'CREATOR_EARNINGS', $10, $11, NOW()
       )
       ON CONFLICT (provider, external_ref) DO NOTHING
       RETURNING id`,
      [
        args.userId,
        args.provider,
        amount,
        args.currency || USD_CURRENCY,
        args.externalRef,
        args.predictionId || null,
        args.description,
        JSON.stringify(args.metadata || {}),
        JSON.stringify(args.metadata || {}),
        args.referenceType || 'settlement',
        args.referenceId || args.predictionId || null,
      ]
    );

    if (txInsert.rowCount === 0) {
      // Idempotent replay: do not double-credit.
      const walletRow = await client.query(
        `SELECT creator_earnings_balance, stake_balance, reserved_balance
         FROM wallets WHERE user_id = $1 AND currency = $2`,
        [args.userId, USD_CURRENCY]
      );
      await client.query('COMMIT');
      const row = walletRow.rows[0] || {};
      return {
        applied: false,
        balances: {
          creatorEarnings: round8(toNumber(row.creator_earnings_balance)),
          stakeBalance: round8(toNumber(row.stake_balance)),
          stakeReserved: round8(toNumber(row.reserved_balance)),
        },
      };
    }

    const before = await readZauBalancesFromClient(client, args.userId).catch(() => ({
      promoAvailable: 0,
      promoLocked: 0,
      creatorEarnings: 0,
    }));

    await credit(
      {
        to: { ownerType: 'user', ownerId: args.userId, bucket: 'CREATOR_EARNINGS' },
        amount,
        reference: {
          type: 'CREATOR_EARNING_CREDIT',
          referenceType: args.referenceType || 'settlement',
          referenceId: args.externalRef,
          metadata: {
            provider: args.provider,
            predictionId: args.predictionId ?? null,
            referenceId: args.referenceId ?? null,
            ...(args.metadata || {}),
          },
        },
      },
      { client }
    );

    const after = await readZauBalancesFromClient(client, args.userId).catch(() => ({
      promoAvailable: before.promoAvailable,
      promoLocked: before.promoLocked,
      creatorEarnings: before.creatorEarnings + amount,
    }));

    await client.query('COMMIT');

    logMoneyMutation({
      action: 'creator_earnings_credit',
      source: 'walletBalanceAccounts.creditCreatorEarnings',
      userId: args.userId,
      predictionId: args.predictionId ?? null,
      amount,
      before: {
        creatorEarnings: round8(before.creatorEarnings),
        promoAvailable: round8(before.promoAvailable),
        promoLocked: round8(before.promoLocked),
      },
      after: {
        creatorEarnings: round8(after.creatorEarnings),
        promoAvailable: round8(after.promoAvailable),
        promoLocked: round8(after.promoLocked),
      },
      meta: {
        provider: args.provider,
        externalRef: args.externalRef,
        referenceType: args.referenceType ?? 'settlement',
      },
    });

    return {
      applied: true,
      balances: {
        creatorEarnings: round8(after.creatorEarnings),
        stakeBalance: round8(after.promoAvailable),
        stakeReserved: round8(after.promoLocked),
      },
    };
  } catch (error) {
    await client.query('ROLLBACK');
    if (error instanceof WalletServiceError) {
      throw new WalletBalanceError(error.code, error.message, error.status);
    }
    throw error;
  } finally {
    client.release();
  }
}

export async function transferCreatorEarningsToStake(args: { userId: string; amount: number }) {
  const amount = round8(args.amount);
  if (!(amount > 0)) {
    throw new WalletBalanceError('INVALID_AMOUNT', 'Amount must be greater than zero');
  }

  const pool = await ensureDbPool();
  if (!pool) {
    throw new WalletBalanceError('DB_TX_UNAVAILABLE', 'Database transaction pool is unavailable', 503);
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await ensureWalletRowPg(client, args.userId, USD_CURRENCY);

    const before = await readZauBalancesFromClient(client, args.userId).catch(() => ({
      promoAvailable: 0,
      promoLocked: 0,
      creatorEarnings: 0,
    }));

    if (before.creatorEarnings < amount) {
      throw new WalletBalanceError(
        'INSUFFICIENT_CREATOR_EARNINGS',
        'Insufficient creator earnings balance for transfer',
        409
      );
    }

    await transfer(
      {
        from: { ownerType: 'user', ownerId: args.userId, bucket: 'CREATOR_EARNINGS' },
        to: { ownerType: 'user', ownerId: args.userId, bucket: 'PROMO_AVAILABLE' },
        amount,
        reference: {
          type: 'CREATOR_EARNING_MOVE',
          referenceType: 'wallet_transfer',
          referenceId: `creator_move:${args.userId}:${Date.now()}`,
          metadata: { source: 'walletRead.transferCreatorEarnings' },
        },
      },
      { client }
    );

    const after = await readZauBalancesFromClient(client, args.userId).catch(() => ({
      promoAvailable: before.promoAvailable + amount,
      promoLocked: before.promoLocked,
      creatorEarnings: before.creatorEarnings - amount,
    }));

    const externalRef = `creator_earnings_transfer:${args.userId}:${Date.now()}`;
    const txInsert = await client.query(
      `INSERT INTO wallet_transactions (
         user_id, direction, type, channel, provider, amount, currency, status, external_ref,
         description, meta, metadata, from_account, to_account, reference_type, reference_id, created_at
       ) VALUES (
         $1, 'credit', 'deposit', 'fiat', 'internal-wallet', $2, $3, 'completed', $4,
         $5, $6::jsonb, $7::jsonb, 'CREATOR_EARNINGS', 'STAKE', 'wallet_transfer', $8, NOW()
       )
       RETURNING id, created_at`,
      [
        args.userId,
      amount,
      USD_CURRENCY,
      externalRef,
        'Move creator earnings to stake balance',
        JSON.stringify({ kind: 'creator_earnings_transfer' }),
        JSON.stringify({ kind: 'creator_earnings_transfer' }),
        args.userId,
      ]
    );

    await client.query('COMMIT');

    logMoneyMutation({
      action: 'creator_earnings_transfer_to_stake',
      source: 'walletBalanceAccounts.transferCreatorEarningsToStake',
      userId: args.userId,
      amount,
      before: {
        creatorEarnings: round8(before.creatorEarnings),
        stakeBalance: round8(before.promoAvailable),
        stakeReserved: round8(before.promoLocked),
      },
      after: {
        creatorEarnings: round8(after.creatorEarnings),
        stakeBalance: round8(after.promoAvailable),
        stakeReserved: round8(after.promoLocked),
      },
      meta: {
        externalRef,
      },
    });

    return {
      transactionId: txInsert.rows[0]?.id || null,
      balances: {
        creatorEarnings: round8(after.creatorEarnings),
        stakeBalance: round8(after.promoAvailable),
        stakeReserved: round8(after.promoLocked),
      },
    };
  } catch (error) {
    await client.query('ROLLBACK');
    if (error instanceof WalletServiceError) {
      throw new WalletBalanceError(error.code, error.message, error.status);
    }
    throw error;
  } finally {
    client.release();
  }
}

export async function listCreatorEarningsHistory(userId: string, limit = 20) {
  const safeLimit = Math.max(1, Math.min(limit, 100));
  const { data, error } = await supabase
    .from('wallet_transactions')
    .select('id, amount, currency, created_at, description, provider, type, channel, from_account, to_account, reference_type, reference_id, meta, metadata, prediction_id')
    .eq('user_id', userId)
    .or('to_account.eq.CREATOR_EARNINGS,from_account.eq.CREATOR_EARNINGS,channel.eq.creator_fee')
    .order('created_at', { ascending: false })
    .limit(safeLimit);

  if (error) {
    throw error;
  }

  return (data || []).map((row: any) => {
    const inferredKind =
      row.from_account === 'CREATOR_EARNINGS' && row.to_account === 'STAKE'
        ? 'CREATOR_EARNING_TRANSFER'
        : 'CREATOR_EARNING_CREDIT';
    return {
      id: row.id,
      type: row.type,
      eventType: inferredKind,
      amount: round8(toNumber(row.amount)),
      currency: row.currency || USD_CURRENCY,
      createdAt: row.created_at,
      description: row.description || '',
      fromAccount: row.from_account || null,
      toAccount: row.to_account || null,
      referenceType: row.reference_type || (row.prediction_id ? 'prediction' : null),
      referenceId: row.reference_id || row.prediction_id || null,
      metadata: row.metadata || row.meta || {},
      provider: row.provider || null,
      channel: row.channel || null,
    };
  });
}
