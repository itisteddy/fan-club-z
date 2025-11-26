import { Router } from 'express';
import { supabase } from '../../config/supabase';
import { chainLogger } from '../../utils/logger';

type ChainActivityItem = {
  id: string;
  kind: string;
  amount: number;
  token: string;
  chainId: number;
  txHash?: string;
  createdAt: string;
  channel?: string | null;
  direction?: string | null;
  description?: string | null;
  feeUSD?: number | null;
  meta?: Record<string, any> | null;
  status?: string | null;
};

export const chainActivity = Router();

chainActivity.get('/activity', async (req, res) => {
  const startTime = Date.now();
  try {
    const userId = String(req.query.userId ?? '');
    const limit = Math.min(Number(req.query.limit || 50), 100);

    if (!userId) {
      chainLogger.warn('Chain activity request missing userId');
      return res.status(400).json({ error: 'userId required' });
    }

    chainLogger.info('Fetching chain activity', { userId, limit });

    const { data: chainRows, error: chainError } = await supabase
      .from('blockchain_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (!chainError && chainRows && chainRows.length > 0) {
      const items = chainRows.map(mapChainLog);
      chainLogger.info('Found blockchain transaction logs', { userId, count: items.length });
      const duration = Date.now() - startTime;
      chainLogger.debug('Chain activity query completed', { userId, duration, source: 'blockchain_transactions' });
      return res.json({ items });
    }

    const { data: txnRows, error: txnError } = await supabase
      .from('wallet_transactions')
      .select('*')
      .eq('user_id', userId)
      .in('provider', ['crypto-base-usdc', 'base-usdc', 'base/usdc'])
      .order('created_at', { ascending: false })
      .limit(limit);

    if (!txnError && txnRows && txnRows.length > 0) {
      const items = txnRows.map(mapTxnRow).filter((i): i is ChainActivityItem => i !== null);
      chainLogger.info('Found wallet transactions', { userId, count: items.length });
      const duration = Date.now() - startTime;
      chainLogger.debug('Chain activity query completed', { userId, duration, source: 'wallet_transactions' });
      return res.json({ items });
    }

    chainLogger.debug('No wallet_transactions found, trying chain_events', { userId });

    const { data: userData } = await supabase
      .from('users')
      .select('wallet_address')
      .eq('id', userId)
      .single();

    if (!userData?.wallet_address) {
      chainLogger.debug('No wallet address for user', { userId });
      return res.json({ items: [] });
    }

    const { data: eventRows, error: eventError } = await supabase
      .from('chain_events')
      .select('*')
      .ilike('user_address', userData.wallet_address.toLowerCase())
      .order('block_time', { ascending: false })
      .limit(limit);

    if (eventError) {
      chainLogger.error('Error fetching chain_events', eventError, { userId });
      return res.json({ items: [] });
    }

    const items = (eventRows || []).map(mapEventRow);
    chainLogger.info('Found chain events', { userId, count: items.length });
    const duration = Date.now() - startTime;
    chainLogger.debug('Chain activity query completed', { userId, duration, source: 'chain_events' });
    return res.json({ items });
  } catch (e) {
    const duration = Date.now() - startTime;
    chainLogger.error('Chain activity server error', e, { duration });
    return res.status(500).json({ error: 'Server error' });
  }
});

function mapTxnRow(row: any): ChainActivityItem | null {
  const meta = parseMeta(row.meta);
  const amount =
    Math.abs(
      Number(
        row.amount ??
          row.amount_usdc ??
          row.amountUSD ??
          meta?.amount ??
          meta?.amount_usdc ??
          0
      )
    ) || 0;
  const channel = (row.channel || '').toLowerCase() || null;
  const direction = (row.direction || '').toLowerCase() || null;
  const kind = deriveKind(channel, direction, row.type, meta);
  const txHash = row.tx_hash || meta?.txHash || extractTxHash(row.external_ref);
  const feeUSD =
    typeof meta?.platform_fee_usd === 'number'
      ? meta.platform_fee_usd
      : typeof meta?.fee_usd === 'number'
      ? meta.fee_usd
      : null;

  return {
    id: row.id || row.external_ref || txHash || `txn-${Date.now()}`,
    kind,
    amount,
    token: row.currency || 'USDC',
    chainId: 84532,
    txHash,
    createdAt: row.created_at || row.occurred_at || new Date().toISOString(),
    channel: row.channel ?? null,
    direction,
    description: row.description || meta?.description || null,
    feeUSD,
    meta,
    status: row.status || meta?.status || null,
  };
}

function mapEventRow(row: any): ChainActivityItem {
  return {
    id: row.tx_hash || row.id || `event-${Date.now()}`,
    kind: (row.event_name || row.event_type || 'event').toLowerCase(),
    amount: Number(row.amount) || 0,
    token: row.token || 'USDC',
    chainId: Number(row.chain_id) || 84532,
    txHash: row.tx_hash || undefined,
    createdAt: row.block_time || row.created_at || new Date().toISOString(),
    channel: row.channel || null,
    direction: row.direction || null,
    description: row.description || null,
    feeUSD: typeof row.fee_usd === 'number' ? row.fee_usd : null,
    meta: {
      contract: row.contract_address,
      blockNumber: row.block_number,
      logIndex: row.log_index,
    },
    status: 'completed',
  };
}

function mapChainLog(row: any): ChainActivityItem {
  const meta = row.metadata || {};
  return {
    id: row.id || row.tx_hash || `log-${Date.now()}`,
    kind: String(row.type || 'transaction').toLowerCase(),
    amount: Number(row.amount || 0),
    token: 'USDC',
    chainId: Number(meta.chainId) || 84532,
    txHash: row.tx_hash,
    createdAt: row.created_at || new Date().toISOString(),
    channel: 'blockchain',
    direction: null,
    description: meta.description || null,
    feeUSD: typeof meta.feeUSD === 'number' ? meta.feeUSD : null,
    meta,
    status: row.status || null,
  };
}

function parseMeta(meta: any): Record<string, any> | null {
  if (!meta) return null;
  if (typeof meta === 'object') return meta;
  if (typeof meta === 'string') {
    try {
      return JSON.parse(meta);
    } catch (error) {
      chainLogger.warn('Failed to parse wallet transaction meta', { error, metaSnippet: meta.slice?.(0, 64) });
      return null;
    }
  }
  return null;
}

function deriveKind(channel: string | null, direction: string | null, type: string | null, meta?: Record<string, any> | null) {
  const candidate = (meta?.event_name || meta?.event || meta?.kind || '').toLowerCase();
  if (candidate) return candidate;

  const normalizedType = (type || '').toLowerCase();

  if (channel === 'escrow_deposit' || channel === 'crypto') return 'deposit';
  if (channel === 'escrow_withdraw') return 'withdraw';
  if (channel === 'escrow_fee') return 'fee';
  if (channel === 'escrow_consumed') {
    return direction === 'credit' ? 'unlock' : 'lock';
  }
  if (channel === 'escrow_released') return 'unlock';
  if (normalizedType === 'bet_lock') return 'lock';
  if (normalizedType === 'bet_release') return 'unlock';
  if (normalizedType === 'payout') return 'win';
  if (normalizedType === 'claim') return 'claim';

  return normalizedType || 'transaction';
}

function extractTxHash(ref?: string | null) {
  if (!ref) return undefined;
  if (ref.startsWith('0x')) {
    return ref.split(':')[0];
  }
  return undefined;
}

