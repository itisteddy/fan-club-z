import { PoolClient } from 'pg';
import { ensureDbPool } from '../utils/dbPool';

export const ZAU_CURRENCY = 'ZAU' as const;
export const PLATFORM_TREASURY_OWNER_ID = '00000000-0000-0000-0000-000000000001';

export type WalletOwnerType = 'user' | 'system';
export type WalletBucket =
  | 'PROMO_AVAILABLE'
  | 'PROMO_LOCKED'
  | 'CREATOR_EARNINGS'
  | 'CASH_AVAILABLE'
  | 'CASH_LOCKED'
  | 'WITHDRAWABLE';

export type WalletLedgerType =
  | 'OPENING_BALANCE'
  | 'DAILY_CLAIM'
  | 'STAKE_LOCK'
  | 'STAKE_UNLOCK'
  | 'PAYOUT'
  | 'PLATFORM_FEE'
  | 'CREATOR_EARNING_CREDIT'
  | 'CREATOR_EARNING_MOVE'
  | 'ADJUSTMENT';

export type WalletOwnerRef = {
  ownerType: WalletOwnerType;
  ownerId: string;
  bucket: WalletBucket;
};

export type WalletReference = {
  type: WalletLedgerType;
  referenceType?: string | null;
  referenceId?: string | null;
  metadata?: Record<string, unknown>;
};

export type WalletBalances = Record<WalletBucket, number>;

export class WalletServiceError extends Error {
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

function assertPositiveAmount(amount: number): number {
  const n = round8(amount);
  if (!(n > 0)) {
    throw new WalletServiceError('INVALID_AMOUNT', 'Amount must be greater than zero');
  }
  return n;
}

function bucketOrderValue(bucket: WalletBucket): number {
  const order: WalletBucket[] = [
    'PROMO_AVAILABLE',
    'PROMO_LOCKED',
    'CREATOR_EARNINGS',
    'CASH_AVAILABLE',
    'CASH_LOCKED',
    'WITHDRAWABLE',
  ];
  return order.indexOf(bucket);
}

async function ensureAccountRow(
  client: PoolClient,
  ownerType: WalletOwnerType,
  ownerId: string,
  bucket: WalletBucket
) {
  await client.query(
    `INSERT INTO wallet_accounts (owner_type, owner_id, currency, bucket, balance, updated_at)
     VALUES ($1, $2, $3, $4, 0, NOW())
     ON CONFLICT (owner_type, owner_id, currency, bucket) DO NOTHING`,
    [ownerType, ownerId, ZAU_CURRENCY, bucket]
  );
}

async function lockAccountRow(
  client: PoolClient,
  ownerType: WalletOwnerType,
  ownerId: string,
  bucket: WalletBucket
): Promise<{ balance: number }> {
  const locked = await client.query(
    `SELECT balance
     FROM wallet_accounts
     WHERE owner_type = $1 AND owner_id = $2 AND currency = $3 AND bucket = $4
     FOR UPDATE`,
    [ownerType, ownerId, ZAU_CURRENCY, bucket]
  );
  if (locked.rowCount === 0) {
    throw new WalletServiceError('ACCOUNT_NOT_FOUND', 'Wallet account not found', 404);
  }
  return { balance: round8(Number(locked.rows[0]?.balance || 0)) };
}

async function syncLegacyWalletMirror(client: PoolClient, userId: string) {
  const balances = await client.query(
    `SELECT bucket, balance
     FROM wallet_accounts
     WHERE owner_type = 'user'
       AND owner_id = $1
       AND currency = $2
       AND bucket IN ('PROMO_AVAILABLE', 'PROMO_LOCKED', 'CREATOR_EARNINGS')`,
    [userId, ZAU_CURRENCY]
  );

  let promoAvailable = 0;
  let promoLocked = 0;
  let creatorEarnings = 0;

  for (const row of balances.rows) {
    const bucket = String(row.bucket) as WalletBucket;
    const balance = round8(Number(row.balance || 0));
    if (bucket === 'PROMO_AVAILABLE') promoAvailable = balance;
    if (bucket === 'PROMO_LOCKED') promoLocked = balance;
    if (bucket === 'CREATOR_EARNINGS') creatorEarnings = balance;
  }

  await client.query(
    `INSERT INTO wallets (
       user_id, currency, available_balance, reserved_balance, demo_credits_balance,
       creator_earnings_balance, stake_balance, updated_at
     ) VALUES ($1, 'DEMO_USD', $2, $3, $2, 0, 0, NOW())
     ON CONFLICT (user_id, currency) DO UPDATE
       SET available_balance = EXCLUDED.available_balance,
           reserved_balance = EXCLUDED.reserved_balance,
           demo_credits_balance = EXCLUDED.demo_credits_balance,
           updated_at = NOW()`,
    [userId, promoAvailable, promoLocked]
  );

  await client.query(
    `INSERT INTO wallets (
       user_id, currency, available_balance, reserved_balance, demo_credits_balance,
       creator_earnings_balance, stake_balance, updated_at
     ) VALUES ($1, 'USD', 0, 0, 0, $2, 0, NOW())
     ON CONFLICT (user_id, currency) DO UPDATE
       SET creator_earnings_balance = EXCLUDED.creator_earnings_balance,
           updated_at = NOW()`,
    [userId, creatorEarnings]
  );
}

async function withWalletTx<T>(
  fn: (client: PoolClient) => Promise<T>,
  existingClient?: PoolClient
): Promise<T> {
  if (existingClient) return fn(existingClient);

  const pool = await ensureDbPool();
  if (!pool) {
    throw new WalletServiceError('DB_TX_UNAVAILABLE', 'Database transaction pool is unavailable', 503);
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

function defaultBalances(): WalletBalances {
  return {
    PROMO_AVAILABLE: 0,
    PROMO_LOCKED: 0,
    CREATOR_EARNINGS: 0,
    CASH_AVAILABLE: 0,
    CASH_LOCKED: 0,
    WITHDRAWABLE: 0,
  };
}

export async function getBalances(userId: string): Promise<WalletBalances> {
  const pool = await ensureDbPool();
  if (!pool) {
    throw new WalletServiceError('DB_TX_UNAVAILABLE', 'Database transaction pool is unavailable', 503);
  }
  const client = await pool.connect();
  try {
    const rows = await client.query(
      `SELECT bucket, balance
       FROM wallet_accounts
       WHERE owner_type = 'user'
         AND owner_id = $1
         AND currency = $2`,
      [userId, ZAU_CURRENCY]
    );
    const balances = defaultBalances();
    for (const row of rows.rows) {
      const bucket = String(row.bucket) as WalletBucket;
      if (bucket in balances) {
        balances[bucket] = round8(Number(row.balance || 0));
      }
    }
    return balances;
  } finally {
    client.release();
  }
}

export async function transfer(
  args: {
    from: WalletOwnerRef;
    to: WalletOwnerRef;
    amount: number;
    reference: WalletReference;
  },
  opts?: { client?: PoolClient }
) {
  const amount = assertPositiveAmount(args.amount);
  if (
    args.from.ownerType === args.to.ownerType &&
    args.from.ownerId === args.to.ownerId &&
    args.from.bucket === args.to.bucket
  ) {
    throw new WalletServiceError('INVALID_TRANSFER', 'Source and destination cannot be identical');
  }

  return withWalletTx(async (client) => {
    await ensureAccountRow(client, args.from.ownerType, args.from.ownerId, args.from.bucket);
    await ensureAccountRow(client, args.to.ownerType, args.to.ownerId, args.to.bucket);

    const pairs: Array<WalletOwnerRef & { side: 'from' | 'to' }> = [
      { ...args.from, side: 'from' },
      { ...args.to, side: 'to' },
    ];
    pairs.sort((a, b) => {
      const keyA = `${a.ownerType}:${a.ownerId}:${bucketOrderValue(a.bucket)}`;
      const keyB = `${b.ownerType}:${b.ownerId}:${bucketOrderValue(b.bucket)}`;
      return keyA.localeCompare(keyB);
    });

    const lockedMap = new Map<string, { balance: number }>();
    for (const p of pairs) {
      const k = `${p.ownerType}:${p.ownerId}:${p.bucket}`;
      if (!lockedMap.has(k)) {
        lockedMap.set(k, await lockAccountRow(client, p.ownerType, p.ownerId, p.bucket));
      }
    }

    const fromKey = `${args.from.ownerType}:${args.from.ownerId}:${args.from.bucket}`;
    const toKey = `${args.to.ownerType}:${args.to.ownerId}:${args.to.bucket}`;
    const fromLocked = lockedMap.get(fromKey);
    const toLocked = lockedMap.get(toKey);
    if (!fromLocked || !toLocked) {
      throw new WalletServiceError('ACCOUNT_NOT_FOUND', 'Wallet account not found', 404);
    }

    if (fromLocked.balance < amount) {
      throw new WalletServiceError('INSUFFICIENT_FUNDS', 'Insufficient balance for transfer', 409);
    }

    const fromNext = round8(fromLocked.balance - amount);
    const toNext = round8(toLocked.balance + amount);

    await client.query(
      `UPDATE wallet_accounts
       SET balance = $5, updated_at = NOW()
       WHERE owner_type = $1 AND owner_id = $2 AND currency = $3 AND bucket = $4`,
      [args.from.ownerType, args.from.ownerId, ZAU_CURRENCY, args.from.bucket, fromNext]
    );
    await client.query(
      `UPDATE wallet_accounts
       SET balance = $5, updated_at = NOW()
       WHERE owner_type = $1 AND owner_id = $2 AND currency = $3 AND bucket = $4`,
      [args.to.ownerType, args.to.ownerId, ZAU_CURRENCY, args.to.bucket, toNext]
    );

    const ledger = await client.query(
      `INSERT INTO wallet_ledger (
         currency, amount,
         from_owner_type, from_owner_id, from_bucket,
         to_owner_type, to_owner_id, to_bucket,
         type, reference_type, reference_id, metadata
       ) VALUES (
         $1, $2,
         $3, $4, $5,
         $6, $7, $8,
         $9, $10, $11, $12::jsonb
       )
       RETURNING id, created_at`,
      [
        ZAU_CURRENCY,
        amount,
        args.from.ownerType,
        args.from.ownerId,
        args.from.bucket,
        args.to.ownerType,
        args.to.ownerId,
        args.to.bucket,
        args.reference.type,
        args.reference.referenceType || null,
        args.reference.referenceId || null,
        JSON.stringify(args.reference.metadata || {}),
      ]
    );

    if (args.from.ownerType === 'user') {
      await syncLegacyWalletMirror(client, args.from.ownerId);
    }
    if (args.to.ownerType === 'user' && args.to.ownerId !== args.from.ownerId) {
      await syncLegacyWalletMirror(client, args.to.ownerId);
    }

    return {
      ledgerId: ledger.rows[0]?.id as string,
      fromBalance: fromNext,
      toBalance: toNext,
    };
  }, opts?.client);
}

export async function credit(
  args: {
    to: WalletOwnerRef;
    amount: number;
    reference: WalletReference;
  },
  opts?: { client?: PoolClient }
) {
  const amount = assertPositiveAmount(args.amount);
  return withWalletTx(async (client) => {
    await ensureAccountRow(client, args.to.ownerType, args.to.ownerId, args.to.bucket);
    const toLocked = await lockAccountRow(client, args.to.ownerType, args.to.ownerId, args.to.bucket);
    const toNext = round8(toLocked.balance + amount);

    await client.query(
      `UPDATE wallet_accounts
       SET balance = $5, updated_at = NOW()
       WHERE owner_type = $1 AND owner_id = $2 AND currency = $3 AND bucket = $4`,
      [args.to.ownerType, args.to.ownerId, ZAU_CURRENCY, args.to.bucket, toNext]
    );

    const ledger = await client.query(
      `INSERT INTO wallet_ledger (
         currency, amount,
         to_owner_type, to_owner_id, to_bucket,
         type, reference_type, reference_id, metadata
       ) VALUES (
         $1, $2,
         $3, $4, $5,
         $6, $7, $8, $9::jsonb
       )
       RETURNING id, created_at`,
      [
        ZAU_CURRENCY,
        amount,
        args.to.ownerType,
        args.to.ownerId,
        args.to.bucket,
        args.reference.type,
        args.reference.referenceType || null,
        args.reference.referenceId || null,
        JSON.stringify(args.reference.metadata || {}),
      ]
    );

    if (args.to.ownerType === 'user') {
      await syncLegacyWalletMirror(client, args.to.ownerId);
    }

    return {
      ledgerId: ledger.rows[0]?.id as string,
      toBalance: toNext,
    };
  }, opts?.client);
}

export async function debit(
  args: {
    from: WalletOwnerRef;
    amount: number;
    reference: WalletReference;
  },
  opts?: { client?: PoolClient }
) {
  const amount = assertPositiveAmount(args.amount);
  return withWalletTx(async (client) => {
    await ensureAccountRow(client, args.from.ownerType, args.from.ownerId, args.from.bucket);
    const fromLocked = await lockAccountRow(client, args.from.ownerType, args.from.ownerId, args.from.bucket);
    if (fromLocked.balance < amount) {
      throw new WalletServiceError('INSUFFICIENT_FUNDS', 'Insufficient balance for debit', 409);
    }
    const fromNext = round8(fromLocked.balance - amount);

    await client.query(
      `UPDATE wallet_accounts
       SET balance = $5, updated_at = NOW()
       WHERE owner_type = $1 AND owner_id = $2 AND currency = $3 AND bucket = $4`,
      [args.from.ownerType, args.from.ownerId, ZAU_CURRENCY, args.from.bucket, fromNext]
    );

    const ledger = await client.query(
      `INSERT INTO wallet_ledger (
         currency, amount,
         from_owner_type, from_owner_id, from_bucket,
         type, reference_type, reference_id, metadata
       ) VALUES (
         $1, $2,
         $3, $4, $5,
         $6, $7, $8, $9::jsonb
       )
       RETURNING id, created_at`,
      [
        ZAU_CURRENCY,
        amount,
        args.from.ownerType,
        args.from.ownerId,
        args.from.bucket,
        args.reference.type,
        args.reference.referenceType || null,
        args.reference.referenceId || null,
        JSON.stringify(args.reference.metadata || {}),
      ]
    );

    if (args.from.ownerType === 'user') {
      await syncLegacyWalletMirror(client, args.from.ownerId);
    }

    return {
      ledgerId: ledger.rows[0]?.id as string,
      fromBalance: fromNext,
    };
  }, opts?.client);
}
