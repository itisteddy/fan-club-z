import { ensureDbPool } from '../utils/dbPool';
import { supabase } from '../config/database';

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

async function ensureWalletRowPg(client: any, userId: string, currency: string) {
  await client.query(
    `INSERT INTO wallets (user_id, currency, available_balance, reserved_balance, demo_credits_balance, creator_earnings_balance, stake_balance, updated_at)
     VALUES ($1, $2, 0, 0, 0, 0, 0, NOW())
     ON CONFLICT (user_id, currency) DO NOTHING`,
    [userId, currency]
  );
}

export async function getWalletBalanceAccountsSummary(userId: string): Promise<BalanceAccountsSummary> {
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

    const locked = await client.query(
      `SELECT available_balance, creator_earnings_balance, stake_balance, reserved_balance
       FROM wallets
       WHERE user_id = $1 AND currency = $2
       FOR UPDATE`,
      [args.userId, USD_CURRENCY]
    );
    const row = locked.rows[0];
    if (!row) {
      throw new WalletBalanceError('WALLET_NOT_FOUND', 'Wallet not found', 404);
    }

    const nextCreatorEarnings = round8(toNumber(row.creator_earnings_balance) + amount);

    await client.query(
      `UPDATE wallets
       SET creator_earnings_balance = $3,
           stake_balance = COALESCE(stake_balance, available_balance, 0),
           updated_at = NOW()
       WHERE user_id = $1 AND currency = $2`,
      [args.userId, USD_CURRENCY, nextCreatorEarnings]
    );

    await client.query('COMMIT');

    return {
      applied: true,
      balances: {
        creatorEarnings: nextCreatorEarnings,
        stakeBalance: round8(toNumber(row.stake_balance ?? row.available_balance)),
        stakeReserved: round8(toNumber(row.reserved_balance)),
      },
    };
  } catch (error) {
    await client.query('ROLLBACK');
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

    const locked = await client.query(
      `SELECT available_balance, reserved_balance, creator_earnings_balance, stake_balance
       FROM wallets
       WHERE user_id = $1 AND currency = $2
       FOR UPDATE`,
      [args.userId, USD_CURRENCY]
    );
    const row = locked.rows[0];
    if (!row) {
      throw new WalletBalanceError('WALLET_NOT_FOUND', 'Wallet not found', 404);
    }

    const creatorEarnings = round8(toNumber(row.creator_earnings_balance));
    const currentStakeBalance = round8(toNumber(row.stake_balance ?? row.available_balance));
    const currentAvailable = round8(toNumber(row.available_balance));

    if (creatorEarnings < amount) {
      throw new WalletBalanceError(
        'INSUFFICIENT_CREATOR_EARNINGS',
        'Insufficient creator earnings balance for transfer',
        409
      );
    }

    const nextCreatorEarnings = round8(creatorEarnings - amount);
    const nextStakeBalance = round8(currentStakeBalance + amount);
    const nextAvailable = round8(currentAvailable + amount);

    await client.query(
      `UPDATE wallets
       SET creator_earnings_balance = $3,
           stake_balance = $4,
           available_balance = $5,
           updated_at = NOW()
       WHERE user_id = $1 AND currency = $2`,
      [args.userId, USD_CURRENCY, nextCreatorEarnings, nextStakeBalance, nextAvailable]
    );

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

    return {
      transactionId: txInsert.rows[0]?.id || null,
      balances: {
        creatorEarnings: nextCreatorEarnings,
        stakeBalance: nextStakeBalance,
        stakeReserved: round8(toNumber(row.reserved_balance)),
      },
    };
  } catch (error) {
    await client.query('ROLLBACK');
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

