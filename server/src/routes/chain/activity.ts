import { Router } from 'express';
import { supabase } from '../../config/supabase';
import { chainLogger } from '../../utils/logger';

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

    // Try wallet_transactions first (preferred)
    // Filter out demo data - only show crypto transactions
    const { data: txnRows, error: txnError } = await supabase
      .from('wallet_transactions')
      .select('*')
      .eq('user_id', userId)
      .in('provider', ['crypto-base-usdc']) // Only crypto provider, exclude 'demo'
      .order('created_at', { ascending: false })
      .limit(limit);

    if (!txnError && txnRows && txnRows.length > 0) {
      chainLogger.info('Found wallet transactions', { userId, count: txnRows.length });
      const duration = Date.now() - startTime;
      chainLogger.debug('Chain activity query completed', { userId, duration, source: 'wallet_transactions' });
      return res.json({ items: txnRows.map(mapTxnRow) });
    }

    // Fallback: chain_events (best effort)
    chainLogger.debug('No wallet_transactions found, trying chain_events', { userId });
    
    // Get user's wallet address
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

    chainLogger.info('Found chain events', { userId, count: eventRows?.length || 0 });
    const duration = Date.now() - startTime;
    chainLogger.debug('Chain activity query completed', { userId, duration, source: 'chain_events' });
    return res.json({ items: (eventRows || []).map(mapEventRow) });

  } catch (e) {
    const duration = Date.now() - startTime;
    chainLogger.error('Chain activity server error', e, { duration });
    res.status(500).json({ error: 'Server error' });
  }
});

function mapTxnRow(r: any) {
  return {
    id: r.id,
    kind: r.event_name || r.type || 'transaction',
    amount: Number(r.amount_usdc) || 0,
    token: 'USDC',
    chainId: 84532,
    txHash: r.tx_hash,
    createdAt: r.created_at || r.occurred_at,
  };
}

function mapEventRow(r: any) {
  return {
    id: r.tx_hash || r.id,
    kind: r.event_name || r.event_type || 'event',
    amount: Number(r.amount) || 0,
    token: 'USDC',
    chainId: 84532,
    txHash: r.tx_hash,
    createdAt: r.block_time || r.created_at,
  };
}

