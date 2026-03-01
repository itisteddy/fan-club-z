import { ensureDbPool } from '../utils/dbPool';

export type LegacyCryptoSnapshotResult = {
  snapshotVersion: string;
  inserted: {
    accounts: number;
    balances: number;
    walletEvents: number;
    chainEvents: number;
  };
};

export async function runLegacyCryptoSnapshot(snapshotVersion: string): Promise<LegacyCryptoSnapshotResult> {
  const pool = await ensureDbPool();
  if (!pool) {
    throw new Error('DATABASE_URL is required to run legacy crypto snapshot');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const accountsInserted = await client.query(
      `
      INSERT INTO legacy_crypto_accounts (snapshot_version, user_id, chain, address, metadata)
      SELECT
        $1,
        ca.user_id,
        COALESCE(ca.chain_id::text, 'unknown'),
        LOWER(ca.address),
        jsonb_build_object('source', 'crypto_addresses')
      FROM crypto_addresses ca
      WHERE ca.user_id IS NOT NULL
      ON CONFLICT (snapshot_version, user_id, chain, address) DO NOTHING
      `,
      [snapshotVersion]
    );

    const balancesInserted = await client.query(
      `
      WITH balance_rows AS (
        SELECT user_id, 'USD_AVAILABLE'::text AS asset, COALESCE(available_balance, 0)::numeric(18,8) AS amount, 'wallets'::text AS source
        FROM wallets
        WHERE currency = 'USD'
        UNION ALL
        SELECT user_id, 'USD_RESERVED'::text, COALESCE(reserved_balance, 0)::numeric(18,8), 'wallets'
        FROM wallets
        WHERE currency = 'USD'
        UNION ALL
        SELECT user_id, 'USD_STAKE'::text, COALESCE(stake_balance, 0)::numeric(18,8), 'wallets'
        FROM wallets
        WHERE currency = 'USD'
      )
      INSERT INTO legacy_crypto_balances_snapshot (snapshot_version, user_id, asset, amount, source, metadata)
      SELECT
        $1,
        b.user_id,
        b.asset,
        b.amount,
        b.source,
        jsonb_build_object('source_table', 'wallets')
      FROM balance_rows b
      WHERE b.amount <> 0
      ON CONFLICT (snapshot_version, user_id, asset, source) DO NOTHING
      `,
      [snapshotVersion]
    );

    const walletEventsInserted = await client.query(
      `
      INSERT INTO legacy_crypto_events_snapshot (
        snapshot_version, source, source_id, user_id, event_type, amount, currency, occurred_at, payload
      )
      SELECT
        $1,
        'wallet_transactions',
        wt.id::text,
        wt.user_id,
        COALESCE(wt.type::text, 'unknown'),
        COALESCE(wt.amount, 0)::numeric(18,8),
        wt.currency::text,
        COALESCE(wt.created_at, NOW()),
        jsonb_build_object(
          'provider', wt.provider,
          'channel', wt.channel,
          'direction', wt.direction,
          'status', wt.status,
          'external_ref', wt.external_ref
        )
      FROM wallet_transactions wt
      WHERE
        COALESCE(wt.provider, '') ILIKE 'crypto%'
        OR COALESCE(wt.channel, '') IN ('crypto', 'escrow_deposit')
      ON CONFLICT (snapshot_version, source, source_id) DO NOTHING
      `,
      [snapshotVersion]
    );

    const chainEventsInserted = await client.query(
      `
      INSERT INTO legacy_crypto_events_snapshot (
        snapshot_version, source, source_id, user_id, event_type, amount, currency, occurred_at, payload
      )
      SELECT
        $1,
        'blockchain_transactions',
        COALESCE(bt.tx_hash, bt.id::text),
        bt.user_id,
        COALESCE(bt.type::text, 'unknown'),
        COALESCE(bt.amount, 0)::numeric(18,8),
        COALESCE(bt.metadata->>'currency', 'USD'),
        COALESCE(bt.created_at, NOW()),
        jsonb_build_object(
          'tx_hash', bt.tx_hash,
          'status', bt.status,
          'wallet_address', bt.wallet_address,
          'metadata', bt.metadata
        )
      FROM blockchain_transactions bt
      ON CONFLICT (snapshot_version, source, source_id) DO NOTHING
      `,
      [snapshotVersion]
    );

    await client.query('COMMIT');

    return {
      snapshotVersion,
      inserted: {
        accounts: accountsInserted.rowCount || 0,
        balances: balancesInserted.rowCount || 0,
        walletEvents: walletEventsInserted.rowCount || 0,
        chainEvents: chainEventsInserted.rowCount || 0,
      },
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
