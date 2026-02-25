import { Router } from 'express';
import { z } from 'zod';
import { supabase } from '../../config/database';
import { VERSION } from '@fanclubz/shared';
import { getFallbackAdminActorId, logAdminAction } from './audit';

export const usersRouter = Router();

function isUuid(value: string | undefined | null): boolean {
  if (!value) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(value));
}

function isSchemaMismatch(err: any): boolean {
  const code = String(err?.code || '');
  const msg = String(err?.message || '');
  return (
    code === '42703' || // undefined_column
    code === '42P01' || // undefined_table
    code === 'PGRST200' ||
    msg.includes('does not exist') ||
    msg.toLowerCase().includes('schema cache') ||
    msg.toLowerCase().includes('could not find the')
  );
}

const SearchQuerySchema = z.object({
  q: z.string().min(1).max(200),
  limit: z.coerce.number().min(1).max(100).default(25),
});

/**
 * GET /api/v2/admin/users/search?q=<text>&limit=25
 * Search users by email, username, full_name, or id
 */
usersRouter.get('/search', async (req, res) => {
  try {
    const parsed = SearchQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid query parameters',
        details: parsed.error.issues,
        version: VERSION,
      });
    }

    const { q, limit } = parsed.data;
    const searchTerm = q.trim().toLowerCase();

    // Check if search term looks like a UUID
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(searchTerm);

    let query = supabase
      .from('users')
      .select('id, username, full_name, email, avatar_url, created_at, is_admin')
      .limit(limit);

    if (isUuid) {
      query = query.eq('id', searchTerm);
    } else {
      // Search by username, full_name, email (case-insensitive partial match)
      query = query.or(
        `username.ilike.%${searchTerm}%,full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`
      );
    }

    const { data: users, error } = await query;

    if (error) {
      console.error('[Admin/Users] Search error:', error);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to search users',
        version: VERSION,
      });
    }

    const items = (users || []).slice(0, limit).map((u: any) => ({
      id: u.id,
      username: u.username,
      fullName: u.full_name,
      email: u.email || null,
      avatarUrl: u.avatar_url,
      isAdmin: u.is_admin || false,
      createdAt: u.created_at,
    }));

    return res.json({
      items,
      total: items.length,
      version: VERSION,
    });
  } catch (error) {
    console.error('[Admin/Users] Search error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to search users',
      version: VERSION,
    });
  }
});

/**
 * GET /api/v2/admin/users/:userId
 * Get user details
 */
usersRouter.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const { data: userRow, error } = await supabase
      .from('users')
      .select('id, username, full_name, email, avatar_url, created_at, is_admin, is_verified')
      .eq('id', userId)
      .maybeSingle();

    if (error || !userRow) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'User not found',
        version: VERSION,
      });
    }

    // Get wallet summary
    const { data: wallet } = await supabase
      .from('wallets')
      .select('available_balance, reserved_balance, total_deposited, total_withdrawn, currency')
      .eq('user_id', userId)
      .eq('currency', 'USD')
      .maybeSingle();

    // Get crypto addresses
    const { data: addresses } = await supabase
      .from('crypto_addresses')
      .select('address, chain_id, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    // Get entry stats
    const { count: totalBets } = await supabase
      .from('prediction_entries')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);

    const { count: totalWins } = await supabase
      .from('prediction_entries')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'won');

    return res.json({
      user: {
        id: userRow.id,
        username: (userRow as any).username,
        fullName: (userRow as any).full_name,
        email: (userRow as any).email || null,
        role: 'user',
        avatarUrl: (userRow as any).avatar_url,
        bio: null,
        isAdmin: (userRow as any).is_admin || false,
        isVerified: (userRow as any).is_verified || false,
        createdAt: (userRow as any).created_at,
      },
      wallet: wallet ? {
        availableBalance: Number(wallet.available_balance || 0),
        reservedBalance: Number(wallet.reserved_balance || 0),
        totalDeposited: Number(wallet.total_deposited || 0),
        totalWithdrawn: Number(wallet.total_withdrawn || 0),
        currency: wallet.currency,
      } : null,
      addresses: addresses || [],
      stats: {
        totalBets: totalBets || 0,
        totalWins: totalWins || 0,
        winRate: totalBets ? ((totalWins || 0) / totalBets * 100).toFixed(1) : '0',
      },
      version: VERSION,
    });
  } catch (error) {
    console.error('[Admin/Users] Get user error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get user details',
      version: VERSION,
    });
  }
});

const UpdateAdminRoleSchema = z.object({
  isAdmin: z.boolean(),
  actorId: z.string().uuid().optional(),
  reason: z.string().max(1000).optional(),
});

/**
 * PATCH /api/v2/admin/users/:userId/role
 * Promote/demote admin privileges for a user.
 */
usersRouter.patch('/:userId/role', async (req, res) => {
  try {
    const { userId } = req.params;
    const parsed = UpdateAdminRoleSchema.safeParse(req.body || {});

    if (!parsed.success) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid payload',
        details: parsed.error.issues,
        version: VERSION,
      });
    }

    const actorId = parsed.data.actorId || getFallbackAdminActorId();
    const desiredIsAdmin = parsed.data.isAdmin;
    const reason = parsed.data.reason?.trim() || undefined;

    const { data: userRow, error: userError } = await supabase
      .from('users')
      .select('id, username, full_name, email, is_admin')
      .eq('id', userId)
      .maybeSingle();

    if (userError || !userRow) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'User not found',
        version: VERSION,
      });
    }

    const currentIsAdmin = Boolean((userRow as any).is_admin);
    if (currentIsAdmin === desiredIsAdmin) {
      return res.json({
        success: true,
        unchanged: true,
        message: desiredIsAdmin ? 'User is already an admin' : 'User is not an admin',
        user: {
          id: userRow.id,
          username: (userRow as any).username || null,
          fullName: (userRow as any).full_name || null,
          email: (userRow as any).email || null,
          isAdmin: currentIsAdmin,
        },
        version: VERSION,
      });
    }

    if (actorId && actorId === userId && desiredIsAdmin === false) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'You cannot remove your own admin access',
        version: VERSION,
      });
    }

    if (currentIsAdmin && desiredIsAdmin === false) {
      const { count: adminCount, error: countError } = await supabase
        .from('users')
        .select('id', { count: 'exact', head: true })
        .eq('is_admin', true as any);

      if (countError) {
        console.error('[Admin/Users] Failed to count admins before demotion:', countError);
        return res.status(500).json({
          error: 'Internal Server Error',
          message: 'Failed to verify admin safety checks',
          version: VERSION,
        });
      }

      if ((adminCount || 0) <= 1) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Cannot remove the last admin',
          version: VERSION,
        });
      }
    }

    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({ is_admin: desiredIsAdmin } as any)
      .eq('id', userId)
      .select('id, username, full_name, email, is_admin')
      .maybeSingle();

    if (updateError || !updatedUser) {
      console.error('[Admin/Users] Role update error:', updateError);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to update user admin role',
        version: VERSION,
      });
    }

    if (actorId) {
      await logAdminAction({
        actorId,
        action: desiredIsAdmin ? 'user_admin_grant' : 'user_admin_revoke',
        targetType: 'user',
        targetId: userId,
        reason,
        meta: {
          previousIsAdmin: currentIsAdmin,
          isAdmin: Boolean((updatedUser as any).is_admin),
          username: (updatedUser as any).username || null,
          email: (updatedUser as any).email || null,
        },
      });
    }

    return res.json({
      success: true,
      message: desiredIsAdmin ? 'Admin access granted' : 'Admin access removed',
      user: {
        id: updatedUser.id,
        username: (updatedUser as any).username || null,
        fullName: (updatedUser as any).full_name || null,
        email: (updatedUser as any).email || null,
        isAdmin: Boolean((updatedUser as any).is_admin),
      },
      version: VERSION,
    });
  } catch (error) {
    console.error('[Admin/Users] Role update error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update user admin role',
      version: VERSION,
    });
  }
});

/**
 * GET /api/v2/admin/users/:userId/summary
 * Alias for GET /api/v2/admin/users/:userId (spec compatibility)
 */
usersRouter.get('/:userId/summary', async (req, res) => {
  try {
    const { userId } = req.params;
    const actorId = (req.query.actorId || (req.body as any)?.actorId) as string | undefined;

    // Lightweight audit when actorId is provided (optional)
    if (isUuid(actorId)) {
      await logAdminAction({
        actorId: actorId!,
        action: 'admin_view_user',
        targetType: 'user',
        targetId: userId,
        meta: { mode: 'summary' },
      });
    }

    // Reuse the same payload as /:userId
    const { data: userRow, error } = await supabase
      .from('users')
      .select('id, username, full_name, email, avatar_url, created_at, is_admin, is_verified')
      .eq('id', userId)
      .maybeSingle();

    if (error || !userRow) {
      return res.status(404).json({ error: 'Not Found', message: 'User not found', version: VERSION });
    }

    const { data: wallet } = await supabase
      .from('wallets')
      .select('available_balance, reserved_balance, total_deposited, total_withdrawn, currency')
      .eq('user_id', userId)
      .eq('currency', 'USD')
      .maybeSingle();

    return res.json({
      user: {
        id: userRow.id,
        username: (userRow as any).username,
        fullName: (userRow as any).full_name,
        email: (userRow as any).email || null,
        avatarUrl: (userRow as any).avatar_url,
        isAdmin: (userRow as any).is_admin || false,
        isVerified: (userRow as any).is_verified || false,
        createdAt: (userRow as any).created_at,
      },
      wallet: wallet
        ? {
            availableBalance: Number(wallet.available_balance || 0),
            reservedBalance: Number(wallet.reserved_balance || 0),
            totalDeposited: Number(wallet.total_deposited || 0),
            totalWithdrawn: Number(wallet.total_withdrawn || 0),
            currency: wallet.currency,
          }
        : null,
      version: VERSION,
    });
  } catch (error) {
    console.error('[Admin/Users] Summary error:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to get user summary', version: VERSION });
  }
});

const ActivityQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(200).default(100),
});

/**
 * GET /api/v2/admin/users/:userId/activity
 * Read-only unified activity list (spec compatibility).
 */
usersRouter.get('/:userId/activity', async (req, res) => {
  try {
    const { userId } = req.params;
    const parsed = ActivityQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Bad Request', message: 'Invalid query parameters', version: VERSION });
    }
    const { limit } = parsed.data;

    const items: any[] = [];

    const { data: txs } = await supabase
      .from('wallet_transactions')
      .select('id, created_at, amount, currency, direction, channel, provider, type, prediction_id, meta')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    for (const tx of txs || []) {
      const provider = String((tx as any).provider || '');
      const rail = provider === 'demo-wallet' ? 'demo' : provider ? 'crypto' : 'demo';
      items.push({
        id: `tx_${tx.id}`,
        type: String((tx as any).channel || (tx as any).type || 'wallet_tx'),
        title: String((tx as any).channel || 'Wallet transaction'),
        amount: Number((tx as any).amount || 0),
        rail,
        created_at: (tx as any).created_at,
        href: (tx as any).prediction_id ? `/admin/predictions/${(tx as any).prediction_id}` : null,
        metadata: {
          direction: (tx as any).direction,
          provider: (tx as any).provider,
          currency: (tx as any).currency,
          meta: (tx as any).meta,
        },
      });
    }

    const { data: entries } = await supabase
      .from('prediction_entries')
      .select('id, created_at, amount, provider, status, prediction_id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    for (const e of entries || []) {
      const provider = String((e as any).provider || '');
      const rail = provider === 'demo-wallet' ? 'demo' : provider ? 'crypto' : 'demo';
      items.push({
        id: `entry_${(e as any).id}`,
        type: 'stake',
        title: 'Stake placed',
        amount: Number((e as any).amount || 0),
        rail,
        created_at: (e as any).created_at,
        href: (e as any).prediction_id ? `/admin/predictions/${(e as any).prediction_id}` : null,
        metadata: { status: (e as any).status, provider: (e as any).provider },
      });
    }

    items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return res.json({ items: items.slice(0, limit), version: VERSION });
  } catch (error) {
    console.error('[Admin/Users] Activity error:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to get activity', version: VERSION });
  }
});

/**
 * GET /api/v2/admin/users/:userId/predictions
 * Returns { active, complete, created } for read-only admin view.
 */
usersRouter.get('/:userId/predictions', async (req, res) => {
  try {
    const { userId } = req.params;

    // Created predictions
    const CREATED_EXT =
      'id, title, status, category, created_at, entry_deadline, end_date, closed_at, settled_at, resolution_date, creator_id';
    const CREATED_BASE = 'id, title, status, category, created_at, entry_deadline, creator_id';

    const createdFirst = await supabase
      .from('predictions')
      .select(CREATED_EXT)
      .eq('creator_id', userId)
      .order('created_at', { ascending: false })
      .limit(200);
    let createdPreds: any[] = (createdFirst.data as any[]) || [];
    let createdErr: any = createdFirst.error;

    if (createdErr && isSchemaMismatch(createdErr)) {
      console.warn('[Admin/Users] Created predictions select schema mismatch, retrying:', createdErr);
      const createdFallback = await supabase
        .from('predictions')
        .select(CREATED_BASE)
        .eq('creator_id', userId)
        .order('created_at', { ascending: false })
        .limit(200);
      createdPreds = (createdFallback.data as any[]) || [];
    }

    // Participated predictions via entries
    const PARTICIPATED_EXT = `
        prediction_id,
        prediction:predictions(id, title, status, category, created_at, entry_deadline, end_date, closed_at, settled_at, resolution_date, creator_id)
      `;
    const PARTICIPATED_BASE = `
        prediction_id,
        prediction:predictions(id, title, status, category, created_at, entry_deadline, creator_id)
      `;

    const entriesFirst = await supabase
      .from('prediction_entries')
      .select(PARTICIPATED_EXT)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(500);
    let entryRows: any[] = (entriesFirst.data as any[]) || [];
    let entryErr: any = entriesFirst.error;

    if (entryErr && isSchemaMismatch(entryErr)) {
      console.warn('[Admin/Users] Participated predictions select schema mismatch, retrying:', entryErr);
      const entriesFallback = await supabase
        .from('prediction_entries')
        .select(PARTICIPATED_BASE)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(500);
      entryRows = (entriesFallback.data as any[]) || [];
    }

    const participatedMap = new Map<string, any>();
    for (const r of entryRows || []) {
      const pred = Array.isArray((r as any).prediction) ? (r as any).prediction[0] : (r as any).prediction;
      const pid = pred?.id || (r as any).prediction_id;
      if (pid && pred && !participatedMap.has(pid)) {
        participatedMap.set(pid, pred);
      }
    }

    const participated = Array.from(participatedMap.values());

    const active: any[] = [];
    const complete: any[] = [];

    for (const p of participated) {
      const status = String((p as any).status || '').toLowerCase();
      const settledAt = (p as any).settled_at || (p as any).resolution_date || null;
      const isComplete = Boolean(settledAt) || status === 'settled' || status === 'complete';
      if (isComplete) complete.push(p);
      else active.push(p);
    }

    return res.json({
      active,
      complete,
      created: createdPreds || [],
      version: VERSION,
    });
  } catch (error) {
    console.error('[Admin/Users] Predictions error:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to get user predictions', version: VERSION });
  }
});

const TimelineQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(200).default(100),
  type: z.enum(['all', 'wallet', 'bets', 'settlements', 'admin']).default('all'),
});

/**
 * GET /api/v2/admin/users/:userId/timeline?limit=100&type=all
 * Get unified timeline for a user (support tool)
 */
usersRouter.get('/:userId/timeline', async (req, res) => {
  try {
    const { userId } = req.params;
    const parsed = TimelineQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid query parameters',
        version: VERSION,
      });
    }

    const { limit, type } = parsed.data;
    const items: any[] = [];

    // Wallet transactions
    if (type === 'all' || type === 'wallet') {
      const { data: transactions } = await supabase
        .from('wallet_transactions')
        .select('id, created_at, type, direction, channel, provider, amount, currency, status, description, external_ref, prediction_id, meta')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (transactions) {
        for (const tx of transactions) {
          items.push({
            id: `tx_${tx.id}`,
            type: 'wallet_tx',
            timestamp: tx.created_at,
            summary: `${tx.direction === 'credit' ? '+' : '-'}$${Math.abs(Number(tx.amount)).toFixed(2)} ${tx.channel}`,
            details: {
              txType: tx.type,
              direction: tx.direction,
              channel: tx.channel,
              provider: tx.provider,
              amount: Number(tx.amount),
              currency: tx.currency,
              status: tx.status,
              description: tx.description,
              externalRef: tx.external_ref,
              predictionId: tx.prediction_id,
              meta: tx.meta,
            },
          });
        }
      }
    }

    // Prediction entries (bets)
    if (type === 'all' || type === 'bets') {
      const { data: entries } = await supabase
        .from('prediction_entries')
        .select(`
          id, created_at, amount, status, provider, actual_payout, option_id,
          prediction:predictions(id, title, status)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (entries) {
        for (const entry of entries) {
          const prediction = Array.isArray(entry.prediction) ? entry.prediction[0] : entry.prediction;
          items.push({
            id: `entry_${entry.id}`,
            type: 'entry',
            timestamp: entry.created_at,
            summary: `Bet $${Number(entry.amount).toFixed(2)} on "${prediction?.title?.slice(0, 40) || 'Unknown'}..."`,
            details: {
              entryId: entry.id,
              amount: Number(entry.amount),
              status: entry.status,
              provider: entry.provider,
              actualPayout: entry.actual_payout ? Number(entry.actual_payout) : null,
              optionId: entry.option_id,
              predictionId: prediction?.id,
              predictionTitle: prediction?.title,
              predictionStatus: prediction?.status,
            },
          });
        }
      }
    }

    // Settlement validations
    if (type === 'all' || type === 'settlements') {
      const { data: validations } = await supabase
        .from('settlement_validations')
        .select(`
          id, created_at, action, reason,
          prediction:predictions(id, title)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (validations) {
        for (const v of validations) {
          const prediction = Array.isArray(v.prediction) ? v.prediction[0] : v.prediction;
          items.push({
            id: `validation_${v.id}`,
            type: 'settlement',
            timestamp: v.created_at,
            summary: `${v.action === 'accept' ? 'Accepted' : 'Disputed'} settlement for "${prediction?.title?.slice(0, 30) || 'Unknown'}..."`,
            details: {
              action: v.action,
              reason: v.reason,
              predictionId: prediction?.id,
              predictionTitle: prediction?.title,
            },
          });
        }
      }
    }

    // Admin actions targeting this user
    if (type === 'all' || type === 'admin') {
      const { data: adminActions } = await supabase
        .from('admin_audit_log')
        .select('id, created_at, action, actor_id, reason, meta')
        .eq('target_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (adminActions) {
        for (const a of adminActions) {
          items.push({
            id: `admin_${a.id}`,
            type: 'admin',
            timestamp: a.created_at,
            summary: `Admin action: ${a.action}`,
            details: {
              action: a.action,
              actorId: a.actor_id,
              reason: a.reason,
              meta: a.meta,
            },
          });
        }
      }
    }

    // Sort by timestamp descending
    items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return res.json({
      items: items.slice(0, limit),
      total: items.length,
      version: VERSION,
    });
  } catch (error) {
    console.error('[Admin/Users] Timeline error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get user timeline',
      version: VERSION,
    });
  }
});
