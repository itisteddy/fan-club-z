import { Router } from 'express';
import { supabase } from '../../config/supabase';

export const chainActivity = Router();

chainActivity.get('/activity', async (req, res) => {
  try {
    const userId = String(req.query.userId ?? '');
    const limit = Math.min(Number(req.query.limit || 50), 100);

    if (!userId) {
      return res.status(400).json({ error: 'userId required' });
    }

    console.log(`[chain/activity] Fetching activity for user: ${userId}, limit: ${limit}`);

    // Try wallet_transactions first (preferred)
    const { data: txnRows, error: txnError } = await supabase
      .from('wallet_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (!txnError && txnRows && txnRows.length > 0) {
      console.log(`[chain/activity] Found ${txnRows.length} wallet transactions`);
      return res.json({ items: txnRows.map(mapTxnRow) });
    }

    // Fallback: chain_events (best effort)
    console.log(`[chain/activity] No wallet_transactions found, trying chain_events`);
    
    // Get user's wallet address
    const { data: userData } = await supabase
      .from('users')
      .select('wallet_address')
      .eq('id', userId)
      .single();

    if (!userData?.wallet_address) {
      console.log(`[chain/activity] No wallet address for user ${userId}`);
      return res.json({ items: [] });
    }

    const { data: eventRows, error: eventError } = await supabase
      .from('chain_events')
      .select('*')
      .ilike('user_address', userData.wallet_address.toLowerCase())
      .order('block_time', { ascending: false })
      .limit(limit);

    if (eventError) {
      console.error('[chain/activity] Error fetching chain_events:', eventError);
      return res.json({ items: [] });
    }

    console.log(`[chain/activity] Found ${eventRows?.length || 0} chain events`);
    return res.json({ items: (eventRows || []).map(mapEventRow) });

  } catch (e) {
    console.error('[chain/activity] Server error:', e);
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

