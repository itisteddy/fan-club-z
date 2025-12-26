import { Router } from 'express';
import { z } from 'zod';
import { supabase } from '../../config/database';
import { VERSION } from '@fanclubz/shared';

export const walletsRouter = Router();

/**
 * GET /api/v2/admin/wallets/user/:userId
 * Get all wallet data for a user (demo + crypto)
 */
walletsRouter.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // Get all wallet rows for this user
    const { data: wallets, error: walletsError } = await supabase
      .from('wallets')
      .select('id, currency, available_balance, reserved_balance, total_deposited, total_withdrawn, updated_at')
      .eq('user_id', userId);

    if (walletsError) {
      console.error('[Admin/Wallets] Error fetching wallets:', walletsError);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to fetch wallets',
        version: VERSION,
      });
    }

    // Get recent transactions grouped by provider
    const { data: recentTxCrypto } = await supabase
      .from('wallet_transactions')
      .select('id, created_at, type, direction, channel, provider, amount, currency, status, description, external_ref, prediction_id')
      .eq('user_id', userId)
      .in('provider', ['crypto-base-usdc', 'base-usdc', 'crypto'])
      .order('created_at', { ascending: false })
      .limit(20);

    const { data: recentTxDemo } = await supabase
      .from('wallet_transactions')
      .select('id, created_at, type, direction, channel, provider, amount, currency, status, description, external_ref, prediction_id')
      .eq('user_id', userId)
      .eq('provider', 'demo-wallet')
      .order('created_at', { ascending: false })
      .limit(20);

    // Get escrow locks
    const { data: escrowLocks } = await supabase
      .from('escrow_locks')
      .select('id, amount, status, prediction_id, created_at, expires_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);

    // Get crypto addresses
    const { data: addresses } = await supabase
      .from('crypto_addresses')
      .select('address, chain_id, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    return res.json({
      wallets: (wallets || []).map(w => ({
        id: w.id,
        currency: w.currency,
        availableBalance: Number(w.available_balance || 0),
        reservedBalance: Number(w.reserved_balance || 0),
        totalDeposited: Number(w.total_deposited || 0),
        totalWithdrawn: Number(w.total_withdrawn || 0),
        updatedAt: w.updated_at,
      })),
      recentTransactions: {
        crypto: recentTxCrypto || [],
        demo: recentTxDemo || [],
      },
      escrowLocks: escrowLocks || [],
      addresses: addresses || [],
      version: VERSION,
    });
  } catch (error) {
    console.error('[Admin/Wallets] Error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch wallet data',
      version: VERSION,
    });
  }
});

const TxQuerySchema = z.object({
  userId: z.string().uuid().optional(),
  provider: z.enum(['all', 'crypto', 'demo']).default('all'),
  limit: z.coerce.number().min(1).max(500).default(100),
  offset: z.coerce.number().min(0).default(0),
});

/**
 * GET /api/v2/admin/wallets/transactions
 * List transactions with filtering
 */
walletsRouter.get('/transactions', async (req, res) => {
  try {
    const parsed = TxQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid query parameters',
        details: parsed.error.issues,
        version: VERSION,
      });
    }

    const { userId, provider, limit, offset } = parsed.data;

    let query = supabase
      .from('wallet_transactions')
      .select('id, user_id, created_at, type, direction, channel, provider, amount, currency, status, description, external_ref, prediction_id, meta', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (userId) {
      query = query.eq('user_id', userId);
    }

    if (provider === 'crypto') {
      query = query.in('provider', ['crypto-base-usdc', 'base-usdc', 'crypto']);
    } else if (provider === 'demo') {
      query = query.eq('provider', 'demo-wallet');
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('[Admin/Wallets] Transaction query error:', error);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to fetch transactions',
        version: VERSION,
      });
    }

    return res.json({
      items: data || [],
      total: count || 0,
      limit,
      offset,
      version: VERSION,
    });
  } catch (error) {
    console.error('[Admin/Wallets] Error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch transactions',
      version: VERSION,
    });
  }
});

/**
 * GET /api/v2/admin/wallets/transactions/export.csv
 * Export transactions as CSV
 */
walletsRouter.get('/transactions/export.csv', async (req, res) => {
  try {
    const parsed = TxQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid query parameters',
        version: VERSION,
      });
    }

    const { userId, provider, limit } = parsed.data;

    let query = supabase
      .from('wallet_transactions')
      .select('id, user_id, created_at, type, direction, channel, provider, amount, currency, status, description, external_ref, prediction_id')
      .order('created_at', { ascending: false })
      .limit(Math.min(limit, 1000)); // Cap at 1000 for exports

    if (userId) {
      query = query.eq('user_id', userId);
    }

    if (provider === 'crypto') {
      query = query.in('provider', ['crypto-base-usdc', 'base-usdc', 'crypto']);
    } else if (provider === 'demo') {
      query = query.eq('provider', 'demo-wallet');
    }

    const { data, error } = await query;

    if (error) {
      console.error('[Admin/Wallets] Export error:', error);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to export transactions',
        version: VERSION,
      });
    }

    // Generate CSV
    const headers = ['id', 'user_id', 'created_at', 'type', 'direction', 'channel', 'provider', 'amount', 'currency', 'status', 'description', 'external_ref', 'prediction_id'];
    const csvRows = [headers.join(',')];

    for (const row of data || []) {
      const values = headers.map(h => {
        const val = (row as any)[h];
        if (val === null || val === undefined) return '';
        const str = String(val);
        // Escape quotes and wrap in quotes if contains comma, quote, or newline
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      });
      csvRows.push(values.join(','));
    }

    const csv = csvRows.join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=transactions_${Date.now()}.csv`);
    return res.send(csv);
  } catch (error) {
    console.error('[Admin/Wallets] Export error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to export transactions',
      version: VERSION,
    });
  }
});

